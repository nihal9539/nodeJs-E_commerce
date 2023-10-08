var db = require('../configuration/connection')
var collection = require('../configuration/collections')
const bcrypt = require('bcrypt')
const collections = require('../configuration/collections')
// const { ObjectId } = require('mongodb')
var objectId = require('mongodb').ObjectId
var Razorpay = require('razorpay')
var instance = new Razorpay({
  key_id: 'rzp_test_03V3SOe8C0Et9i',
  key_secret: 'UCMhuSK4tsk43EmQu1IZz6YM'
})

module.exports = {
  doSignup: (userData) => {
    return new Promise(async (resolve, reject) => {
      userData.password = await bcrypt.hash(userData.password, 10);
      // console.log(userData.password )
      db.get()
        .collection(collection.USER_COLLECTION)
        .insertOne(userData)
        .then((data) => {
          userData._id = data.insertedId
          // console.log(userData);
          resolve(userData);
        });

    })
  },
  doLogin: (userData) => {
    return new Promise(async (resolve, reject) => {
      let loginStatus = false
      let response = {}
      let user = await db.get().collection(collection.USER_COLLECTION).findOne({ Email: userData.Email })
      if (user) {
        bcrypt.compare(userData.password, user.password).then((status) => {
          if (status) {
            console.log('login sucess');
            response.user = user
            response.status = true
            resolve(response)
          }
          else {
            console.log('login failed');
            resolve({ status: false })
          }
        })
      } else {
        console.log('login failed');
        resolve({ status: false })
      }
    })
  },
  addToCart: (proId, userId) => {
    let proObj = {
      item: objectId(proId),
      quantity: 1
    }
    return new Promise(async (resolve, reject) => {
      let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
      if (userCart) {
        let proExist = userCart.products.findIndex(product => product.item == proId)
        console.log(proExist);
        if (proExist != -1) {
          db.get().collection(collection.CART_COLLECTION)
            .updateOne({ user: objectId(userId), 'products.item': objectId(proId) },
              {
                $inc: { 'products.$.quantity': 1 }
              }).then(() => {
                resolve()
              })
        } else {
          db.get().collection(collection.CART_COLLECTION)
            .updateOne({ user: objectId(userId) },
              {
                $push: { products: proObj }
              }
            )
        }


      } else {
        let cartObj = {
          user: objectId(userId),
          products: [proObj]
        }
        db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response) => {
          resolve()
        })
      }
    })
  },
  getCartProducts: (userId) => {
    return new Promise(async (resolve, reject) => {
      let cartItem = await db.get().collection(collection.CART_COLLECTION).aggregate([
        {
          $match: { user: objectId(userId) }
        },
        {
          $unwind: '$products'
        }, {
          $project: {
            item: '$products.item',
            quantity: '$products.quantity'
          }
        }, {
          $lookup: {
            from: collection.PRODUCT_COLLECTIONS,
            localField: 'item',
            foreignField: '_id',
            as: 'product'
          }
        },
        {
          $project: {
            item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
          }
        }

      ]).toArray()
      // console.log(cartItem[0].products);
      resolve(cartItem)
    })
  },
  getCartCount: (userId) => {
    return new Promise(async (resolve, reject) => {
      let count = 0;
      let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
      if (cart) {
        count = cart.products.length
      }
      resolve(count)
    })
  },
  changeProductQuantity: (details) => {
    details.count = parseInt(details.count)
    details.quantity = parseInt(details.quantity)

    return new Promise((resolve, reject) => {
      if (details.count == -1 && details.quantity == 1) {
        db.get().collection(collection.CART_COLLECTION).updateOne({ _id: objectId(details.cart) },
          {
            $pull: { products: { item: objectId(details.product) } }
          }
        ).then(() => {
          resolve({ removeProduct: true })
        })
      }
      db.get().collection(collection.CART_COLLECTION)
        .updateOne({ _id: objectId(details.cart), 'products.item': objectId(details.product) },
          {
            $inc: { 'products.$.quantity': details.count }
          }).then((response) => {
            resolve({ status: true })
          })
    })
  },
  getTotalAmount: async (userId) => {
    return new Promise(async (resolve, reject) => {
      let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
        {
          $match: { user: objectId(userId) }
        },
        {
          $unwind: '$products'
        }, {
          $project: {
            item: '$products.item',
            quantity: '$products.quantity'
          }
        }, {
          $lookup: {
            from: collection.PRODUCT_COLLECTIONS,
            localField: 'item',
            foreignField: '_id',
            as: 'product'
          }
        },
        {
          $project: {
            item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
          }
        },
        {
          $group: {
            // product:parseInt('$product.Price'),
            _id: null,
            total: { $sum: { $multiply: ['$quantity', { $toInt: '$product.Price' }] } }
          }
        }

      ]).toArray()
      // console.log(total);
      if (total == null) {
        resolve()
      }
      resolve(total[0].total)
    })
  },
  placeOrder: (order, products, total) => {
    return new Promise((resolve, reject) => {
      console.log(order, products, total);
      let status = order['payment-method'] === 'COD' ? 'placed' : 'pending'
      let orderObj = {
        deliveryDetails: {
          mobile: order.mobile,
          address: order.address,
          pincode: order.pincode
        },
        userId: objectId(order.userId),
        paymentMethod: order['payment-method'],
        products: products,
        totalAmount: total,
        status: status,
        date: new Date()

      }
      db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response) => {
        db.get().collection(collection.CART_COLLECTION).deleteOne({ user: objectId(order.userId) })
        // console.log(response.insertedId+" azsxedcrfvtgbh");
        resolve(response.insertedId)
      })
    })
  },
  getCartProductList:(userId) => {
    // console.log('1111'+userIds);
    return new Promise(async (resolve, reject) => {
      let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
      // console.log(cart);
      // console.log(cart.products);
      // if (cart == null) {
      //   resolve()
      // }
      resolve(cart.products)
    })
  },
  showOrders: async (userId) => {

  },
  getUserOrders: (userId) => {
    return new Promise(async (resolve, reject) => {
      let orders = await db.get().collection(collection.ORDER_COLLECTION).find({ userId: objectId(userId) }).toArray()
      // console.log(orders);
      resolve(orders)
    })

  },
  getOrderProduct: async (orderId) => {
    return new Promise(async (resolve, reject) => {
      let orderItems = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
        {
          $match: { _id: objectId(orderId) }
        },
        {
          $unwind: '$products'
        }, {
          $project: {
            item: '$products.item',
            quantity: '$products.quantity'
          }
        }, {
          $lookup: {
            from: collection.PRODUCT_COLLECTIONS,
            localField: 'item',
            foreignField: '_id',
            as: 'product'
          }
        },
        {
          $project: {
            item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 1   ] }
          }
        }

      ]).toArray()
      // console.log(total);
      resolve(orderItems)
    })
  },
  removerProduct: (proId) => {
    return new Promise((resolve, reject) => {
      // let item = products.item
      db.get().collection(collections.CART_COLLECTION).deleteOne({ item: objectId(proId) }).then((response) => {
        resolve(response)
      })
    })
  },
  generateRazorpay: (orderId,totalAmount) => {
   return new Promise((resolve,reject)=>{
    console.log(orderId,totalAmount);
    
   
    instance.orders.create({
       amount: totalAmount*100, 
      currency: "INR",
      receipt: ""+orderId,
       },
      function(err,order){
        if (err) {
          console.log(err);
        }else{
          console.log("new order",order);
        resolve(order)
        
        }
      }
      )
    
   
    
   })
  },
  verifyPayment:(details)=>{
return new Promise((resolve,reject)=>{
  const crypto = require('crypto')
  var hmac = crypto.createHmac('sha256','UCMhuSK4tsk43EmQu1IZz6YM')
  hmac.update(details['payment[razorpay_order_id]']+'|'+details['payment[razorpay_payment_id]'])
  hmac=hmac.digest('hex')
  if (hmac==details['payment[razorpay_signature]']) {
    resolve()
  }else{
    reject()
  }
})
  },
  changePaymentStatus:(orderId)=>{
    return new Promise((resolve,reject)=>{
      db.get().collection(collection.ORDER_COLLECTION)
      .updateOne({_id:objectId(orderId)},{
        $set:{
          status:'placed'
        }
      }).then(()=>{
        resolve()
      })
    })
  },
  getAllUser: async (callback) => {
    return new Promise(async (resolve, reject) => {
      let user = await db.get().collection(collections.USER_COLLECTION).find().toArray()
      console.log(user);
      resolve(products)
    })
  },
}

// var options = {
//   amount: totalAmount,
//   currency: "INR",
//   receipt: orderId,
// }
// instance.orders.create({options,function(err,orders){
//   console.log("new order",orders);
//   resolve(orders)
  
// } })
