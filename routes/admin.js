var express = require('express');
var router = express.Router();
var productHelper = require('../helpers/pd-helpers');
const userHelpers = require('../helpers/user-helpers');
/* GET users listing. */
router.get('/', function (req, res, next) {
  productHelper.getAllProduct().then((products) => {
    console.log(products);
    res.render('admin/view-products', { admin: true, products })
  })

});
// router.get('/add-product', function (req, res) {
//   res.render('admin/add-product');

// })
router.post('/add-product', function (req, res) {
  //  console.log(req.body)
  //  console.log(req.files.image);
  productHelper.addProduct(req.body, (id) => {
    let image = req.files.image
    image.mv('./public/product-images/' + id + '.jpg', (err, done) => {
      if (!err) {
        res.render('admin/add-product')
      } else {
        console.log(err);
      }
    })

  })
})
router.get('/delete-product/:id', (req, res) => {
  let proId = req.params.id
  productHelper.deleteProduct(proId).then((response) => {
    res.redirect('/admin/')
  })
})
router.get('/edit-product/:id', async (req, res) => {
  let product = await productHelper.getproductDetails(req.params.id)
  console.log(product);
  res.render('admin/edit-product', { product })
})
router.post('/edit-product/:id', (req, res) => {
  let id = req.params.id
  productHelper.updateProduct(req.params.id, req.body).then(() => {
    res.redirect('/admin')
    if (req.files.image) {
      let image = req.files.image
      image.mv('./public/product-images/' + id + '.jpg',)
    }

  })

})
// router.get('/Orders', (req, res) => {
//   res.render('/admin/all-order')
// })

// router.get('/alluser', (req, res, next) => {
//   userHelpers.getAllUser().then((user) => {
//     console.log(user);
//   })
//   res.redirect('/admin')
// })


module.exports = router;

