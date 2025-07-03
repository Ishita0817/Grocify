import Order from "../models/Order.js";
import Product from "../models/Product.js";





//Place Order COD: /api/order/cod
export const placeOrderCOD = async(req, res)=>{
  try {
    const { userId, items, address}= req.body;
    if(!address || items.length ===0){
      return res.json({success: false, message: "Invalid data"})
    }
    // Calculate Amount using Items
    let amount = await items.reduce(async(acc, item)=>{
      const product = await Product.findById(item.product);
      return (await acc) + product.offerPrice * item.quantity;
    },0)

    //Add Tax charge (2%)
    amount += Math.floor(amount * 0.02);
    await Order.create({
      userId,
      items,
      amount,
      address,
      paymentType: "COD",
    });
    return res.json({success: true, message: "Order Placed Successfully"})

  } catch (error) {
    return res.json({success: false, message: error.message});
    
  }
}

//Get Orders by UserId : /api/order/user
export const getUserOrders = async( req,res)=>{
  try {
    const { userId } = req.body;
    const orders = await Order.find({
      userId,
      $or: [{paymentType: "COD"},{isPaid: true}]
    }).populate("items.product address").sort({createdAT: -1});
    res.json({success: true, orders});
  } catch (error) {
    res.json({success: false, message: error.message});
  }
}

// get All Orders (for seller/admin) : /api/order/seller

export const getAllOrders = async( req,res)=>{
  try {
    const orders = await Order.find({
      $or: [{paymentType: "COD"},{isPaid: true}]
    }).populate("items.product address").sort({createdAT: -1});
    res.json({success: true, orders});
  } catch (error) {
    res.json({success: false, message: error.message});
  }
}