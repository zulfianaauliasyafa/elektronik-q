const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const productSchema = new Schema({ //set up blue print of products
  title: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  //products should be linked to users schema
  userId: {
    type: Schema.Types.ObjectId,
    ref:'User',
    required: true
  }

});

module.exports = mongoose.model('Product', productSchema);
