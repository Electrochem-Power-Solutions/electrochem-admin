import mongoose, { Schema, Document, models, Types } from 'mongoose';

import { OrderItem, Address } from './user'; 


export const addressSchema = new Schema({
  type: { type: String, enum: ['billing', 'shipping'], required: true },
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  country: { type: String, required: true },
  phone: { type: String, required: false },
})

export const orderItemSchema = new Schema({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, default: 0 },
  Ah_Rating_Selected: { type: Number, default: 0 },
  Voltage_Rating_Selected: { type: Number, default: 0 },
  Kw_Rating: { type: Number, default: 0 },
  Price: { type: Number, required: true, default: 0 },
})

export interface IOrder extends Document {
  user: Types.ObjectId;
  items: OrderItem[]; 
  totalAmount: number;
  status: 'pending' | 'placed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress: Address;
  billingAddress: Address;
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  items: [orderItemSchema], 
  totalAmount: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['pending' ,'placed','processing', 'shipped', 'delivered', 'cancelled'], 
    default: 'pending' 
  },
  shippingAddress: { type: addressSchema, required: true },
  billingAddress: { type: addressSchema, required: true },
}, { 
  timestamps: true 
});

export const Order = models.Order || mongoose.model<IOrder>('Order', orderSchema);