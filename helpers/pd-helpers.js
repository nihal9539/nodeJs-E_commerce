// const { response } = require('express');
const collections = require('../configuration/collections');
var db = require('../configuration/connection')
var objectId = require('mongodb').ObjectId


module.exports = {

  addProduct: (product, callback) => {
    console.log(product);
    db.get().collection(collections.PRODUCT_COLLECTIONS).insertOne(product).then((data) => {
      console.log(data);
      callback(data.insertedId);
    })
  },
  getAllProduct: async (callback) => {
    return new Promise(async (resolve, reject) => {
      let products = await db.get().collection(collections.PRODUCT_COLLECTIONS).find().toArray()
      resolve(products)
    })
  },
  deleteProduct:(proId)=>{
    return new Promise((resolve,reject)=>{
        db.get().collection(collections.PRODUCT_COLLECTIONS).deleteOne({_id:objectId(proId)}).then((response)=>{
          resolve(response)
        })
    })
  },
  getproductDetails:(proId)=>{
    return new Promise((resolve,reject)=>{
      db.get().collection(collections.PRODUCT_COLLECTIONS).findOne({_id:objectId(proId)}).then((product)=>{
        resolve(product)
      })
    })
  },
  updateProduct:(proId,proDetails)=>{
    return new Promise((resolve,reject)=>{
      db.get().collection(collections.PRODUCT_COLLECTIONS)
      .updateOne({_id:objectId(proId)},
      {
        $set:{
          Name:proDetails.Name,
          Description:proDetails.Description,
          Price:proDetails.Price,
          Category:proDetails.Category
        }
      }).then((response)=>{
        resolve(response)
      })
    })
  }
}