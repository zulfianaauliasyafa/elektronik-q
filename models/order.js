const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const orderSchema = new Schema({
  products: [ //array of documents
    {
      product: { type: Object, required: true },
      quantity: { type: Number},
    }
  ],
 totalOrder: {
      type: Number,
    }, 
  user: {
    email: {
      type: String,
      required: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User'
    } //will refer to user model
  }
});

module.exports = mongoose.model('Order', orderSchema);
