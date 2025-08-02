import Order from "../models/Order.js";
import Product from "../models/Product.js";
import razorpay from "razorpay";
import dotenv from "dotenv";
dotenv.config();

//Place Order COD: /api/order/cod
export const placeOrderCOD = async (req, res) => {
  try {
    const { userId, items, address } = req.body;
    if (!address || items.length === 0) {
      return res.json({ success: false, message: "Invalid data" });
    }
    // Calculate Amount using Items
    // let amount = await items.reduce(async (acc, item) => {
    //   const product = await Product.findById(item.product);
    //   return (await acc) + product.offerPrice * item.quantity;
    // }, 0);

    // Proper async-safe calculation
    const itemPrices = await Promise.all(
      items.map(async (item) => {
        const product = await Product.findById(item.product);
        return product.offerPrice * item.quantity;
      })
    );

    let amount = itemPrices.reduce((acc, val) => acc + val, 0);
    amount += Math.floor(amount * 0.02); // 2% tax

    //Add Tax charge (2%)
    amount += Math.floor(amount * 0.02);
    await Order.create({
      userId,
      items,
      amount,
      address,
      paymentType: "COD",
    });
    return res.json({ success: true, message: "Order Placed Successfully" });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};
// PAYMENT GATEWAY: /API/ORDER/RAZORPAY
// PAYMENT GATEWAY: /api/order/razorpay
// PAYMENT GATEWAY: /api/order/razorpay
// export const placeOrderRazorpay = async (req, res) => {
//   try {
//     const { userId, items, address } = req.body;

//     console.log("🔸 Razorpay Order request body:", req.body);

//     if (!address || items.length === 0) {
//       console.log("❌ Missing address or empty items");
//       return res.json({ success: false, message: "Invalid data" });
//     }

//     let amount = await items.reduce(async (acc, item) => {
//       const product = await Product.findById(item.product);
//       return (await acc) + product.offerPrice * item.quantity;
//     }, 0);

//     amount += Math.floor(amount * 0.02); // 2% tax

//     // Initialize Razorpay
//     const razorpayInstance = new razorpay({
//       key_id: process.env.RAZORPAY_KEY_ID,
//       key_secret: process.env.RAZORPAY_KEY_SECRET,
//     });

//     const options = {
//       amount: amount * 100,
//       currency: "INR",
//       receipt: `order_rcptid_${Math.floor(Math.random() * 1000000)}`,
//       notes: { userId },
//     };

//     const razorpayOrder = await razorpayInstance.orders.create(options);

//     console.log("🟢 Razorpay order created:", razorpayOrder);

//     // ✅ Save order in DB after Razorpay order created
//     const order = await Order.create({
//       userId,
//       items,
//       amount,
//       address,
//       paymentType: "Online",
//       razorpayOrderId: razorpayOrder.id, // optional
//     });

//     console.log("✅ Order saved in DB with Razorpay ID");

//     return res.json({
//       success: true,
//       orderId: razorpayOrder.id,
//       amount: razorpayOrder.amount,
//       currency: razorpayOrder.currency,
//       key: process.env.RAZORPAY_KEY_ID,
//     });
//   } catch (error) {
//     console.log("❌ Razorpay Payment Error:", error);
//     return res.json({ success: false, message: error.message });
//   }
// };

export const placeOrderRazorpay = async (req, res) => {
  try {
    const { userId, items, address } = req.body;

    console.log("🔸 Razorpay Order request body:", req.body);

    if (!userId || !address || !Array.isArray(items) || items.length === 0) {
      console.log("❌ Missing userId, address, or empty items");
      return res.status(400).json({ success: false, message: "Invalid data" });
    }

    // ✅ FIXED async-safe calculation
    const itemPrices = await Promise.all(
      items.map(async (item) => {
        const product = await Product.findById(item.product);
        return product.offerPrice * item.quantity;
      })
    );

    let amount = itemPrices.reduce((acc, val) => acc + val, 0);
    amount += Math.floor(amount * 0.02); // Add 2% tax

    // ✅ Initialize Razorpay
    const razorpayInstance = new razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount: amount * 100, // Convert to paise
      currency: "INR",
      receipt: `order_rcptid_${Math.floor(Math.random() * 1000000)}`,
      notes: { userId },
    };

    const razorpayOrder = await razorpayInstance.orders.create(options);

    console.log("🟢 Razorpay order created:", razorpayOrder);

    // ✅ Save order in DB
    await Order.create({
      userId,
      items,
      amount,
      address,
      paymentType: "Online",
      razorpayOrderId: razorpayOrder.id,
    });

    console.log("✅ Order saved in DB with Razorpay ID");

    return res.status(200).json({
      success: true,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.log("❌ Razorpay Payment Error:", error);

    if (error?.error?.description) {
      console.log("🔴 Razorpay API Error Details:", error.error.description);
    }

    return res
      .status(500)
      .json({
        success: false,
        message: error.message || "Order creation failed",
      });
  }
};

//Get Orders by UserId : /api/order/user
export const getUserOrders = async (req, res) => {
  try {
    const { userId } = req.body;
    const orders = await Order.find({
      userId,
      $or: [{ paymentType: "COD" }, { isPaid: true }],
    })
      .populate("items.product address")
      .sort({ createdAT: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// get All Orders (for seller/admin) : /api/order/seller

export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      $or: [{ paymentType: "COD" }, { isPaid: true }],
    })
      .populate("items.product address")
      .sort({ createdAT: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
