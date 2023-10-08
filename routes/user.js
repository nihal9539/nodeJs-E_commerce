var express = require('express');
var router = express.Router();
var productHelper = require('../helpers/pd-helpers')
const userHelpers = require('../helpers/user-helpers')


const verifyLOgin = (req, res, next) => {
  if (req.session.user.loggedIn) {
    next()
  } else {
    res.redirect('/login')
  }
}
/* GET home page. */
router.get('/', async function (req, res, next) {
  let user = req.session.user
  let cartCount = null;
  if (req.session.user) {
    cartCount =await userHelpers.getCartCount(req.session.user._id)
  }

  productHelper.getAllProduct().then((products) => {

    res.render('user/view-products', { products, user, cartCount })
  })
});
router.get('/login', (req, res) => {
  if (req.session.user == true) { 
    res.redirect('/')
  } else {
    res.render('user/login', { "loginErr": req.session.userloginError })
    req.session.userloginError = false
  }
})
router.get('/signup', (req, res) => {
  res.render('user/signup')
})
router.post('/signup', (req, res) => {

  userHelpers.doSignup(req.body).then((response) => {
    // console.log(req.body);
    // console.log(response);
    req.session.user = response
    req.session.user.loggedIn = true
    res.redirect('/')
  })
})

router.post('/login', (req, res) => {
  userHelpers.doLogin(req.body).then((response) => {
    if (response.status) {
      req.session.user = response.user
      req.session.user.loggedIn = true
      res.redirect('/')
    } else {
      req.session.userloginError = "Invalid session name or password"
      res.redirect('/login')
    }
  })

})
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/')
})

router.get('/cart', verifyLOgin, async (req, res) => {

  let products = await userHelpers.getCartProducts(req.session.user._id)
  let totalAmount=0;
  if (products.length>0) {
     totalAmount = await userHelpers.getTotalAmount(req.session.user._id)
  }
  
  let user =  req.session.user._id
  console.log("totaldfvgybhnj",totalAmount);
  // console.log(products);
  
  res.render('user/cart', { products, user,totalAmount })
  
})
router.get('/add-to-cart/:id', verifyLOgin, (req, res) => {
  userHelpers.addToCart(req.params.id, req.session.user._id).then(() => {
    
    res.json({status:true})
  })
}),
router.post('/change-product-quantity',(req,res,next)=>{
  // console.log(req.body);
  userHelpers.changeProductQuantity(req.body).then(async(response)=>{
    response.total=await userHelpers.getTotalAmount(req.body.user)
      res.json(response)
  })
})
router.get('/remove-product/:id',(req,res)=>{
  userHelpers.removerProduct(req.params.id).then(()=>{
    res.redirect('/')
  })
  
})
router.get('/place-order',verifyLOgin, async(req,res)=>{
  let total = await userHelpers.getTotalAmount(req.session.user._id)
  res.render('user/place-order',{total,user:req.session.user});
})
router.post('/place-order',async(req,res)=>{
  let products = await userHelpers.getCartProductList(req.body.userId)
  let totalPrice = await userHelpers.getTotalAmount(req.body.userId)
  await userHelpers.placeOrder(req.body,products,totalPrice).then((orderId)=>{
    console.log("crtvfygbhu"+orderId);
    if (req.body['payment-method']==='COD') {
      res.json({codSuccess:true})
    }else{
      userHelpers.generateRazorpay(orderId,totalPrice).then((responses)=>{
        console.log(responses);
        res.json(responses)
      })
      // res.json({status:false})
    }
    // res.redirect('user/cart')
   })
  console.log(req.body);
})
router.get('/order',verifyLOgin,async(req,res)=>{
  let orders =await userHelpers.getUserOrders(req.session.user._id)
  res.render('user/order',{user:req.session.user,orders})
})
router.get('/order-sucess',(req,res)=>{
 
  res.render('user/order-sucess')
})
router.get('/view-order-product/:id',verifyLOgin,async(req,res)=>{
  let products = await userHelpers.getOrderProduct(req.params.id);
  res.render('user/view-order-product',{user:req.session.user,products})
})

router.post('/verify-payment',(req,res)=>{
  console.log(req.body);
  userHelpers.verifyPayment(req.body).then(()=>{
    userHelpers.changePaymentStatus(req.body['order[receipt]']).then(()=>{
      console.log('Payment success');
      res.json({status:true})
    })

  }).catch((err)=>{
    console.log(err);
    res.json({status:false,errMsg:''})
  })
})

module.exports = router;
