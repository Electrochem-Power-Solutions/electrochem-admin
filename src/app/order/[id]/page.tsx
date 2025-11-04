'use client'
import { useEffect, useState, use } from "react"
import { toast } from "sonner"

import Link from 'next/link'  

interface IAddress {
  street: string;
  city: string;
  state: string;
  zipCod: string; 
}

interface IUser {
  _id: string;
  name: string;
  email: string;
}

interface IProduct {
  _id: string;
  productName: string;
  image: string[];
  price: number;
  stock: number;
}

interface IItem {
  product_id: IProduct | null;
  quantity: number;
  Price: number; 
  Ah_Rating_Selected: number;
  Kw_Rating: number;
  Voltage_Rating_Selected: number;
}


interface Order {
  _id: string;
  totalAmount: number;
  status:
    | "pending"
    | "placed"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled";
  createdAt: string;
  items: IItem[];
  shippingAddress: IAddress;
  billingAddress: IAddress;
  user: IUser;
}

const statusColorMap: Record<Order["status"], string> = {
  pending: "bg-yellow-100 text-yellow-800",
  placed: "bg-blue-100 text-blue-800",
  processing: "bg-cyan-100 text-cyan-800",
  shipped: "bg-orange-100 text-orange-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function OrderDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [loading, setLoading] = useState<boolean>(true); 
  
 
  const [orderData, setOrderData] = useState<Order | null>(null);

  useEffect(() => {
    
    const getOrderDetails = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/orderDetails?orderId=${id}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch: ${res.statusText}`);
        }
        const data = await res.json();
        
        
        setOrderData(data.data); 

      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error in Fetching Order");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      getOrderDetails();
    }
  }, [id]) 

  if (loading) {
    return <div className="p-10 text-center">Loading Data...</div>;
  }

  if (!orderData) {
    return <div className="p-10 text-center text-red-500">Order not found.</div>;
  }

 
  return (
    <div className="bg-gray-200 min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        
        <div className="mb-6">
          <Link href="/order" className="text-green-600 hover:underline text-sm">
            &larr; Back to all orders
          </Link>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mt-2">
            <h1 className="text-3xl font-bold text-gray-900">
              Order Details
            </h1>
            <div className="flex items-center gap-3 mt-2 md:mt-0">
              <span className="text-sm text-gray-600 font-mono break-all">
                {orderData._id}
              </span>
              <span
                className={`text-sm font-medium px-3 py-1 rounded-full ${
                  statusColorMap[orderData.status]
                }`}
              >
                {orderData.status.charAt(0).toUpperCase() + orderData.status.slice(1)}
              </span>
            </div>
          </div>
          <p className="text-purple-500 text-sm mt-1">
            Date: {new Date(orderData.createdAt).toLocaleString()}
          </p>
        </div>

        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          

          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">Items in Order</h2>
            {orderData.items.map((item, index) => (
              <div 
                
                key={item.product_id?._id || index} 
                className="bg-white border border-green-600 rounded-lg p-4 flex flex-col md:flex-row gap-4"
              >
                
                <div className="flex-grow">
                  <h3 className="font-semibold text-lg text-gray-800">
                    {item.product_id?.productName ?? 'Product not found'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Product_ID: {item.product_id?._id ?? 'N/A'}
                  </p>
                  
                 
                </div>
                <div className="text-right md:min-w-[120px]">
                  <p className="text-lg font-semibold text-gray-900">
                    ₹{item.Price.toFixed(2)}
                  </p>
                  <p className="text-gray-500 text-sm">
                    Qty: {item.quantity}
                  </p>
                </div>
              </div>
            ))}
          </div>

          
          <div className="lg:col-span-1 space-y-6">
            
            
            <div className="bg-white border border-green-500 rounded-lg p-4">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Order Summary</h2>
              
                
                <div className="flex justify-between border-t pt-2 mt-2">
                  <dt className="text-lg font-bold text-black">Total Amount</dt>
                  <dd className="text-lg font-bold text-gray-900">₹{orderData.totalAmount.toFixed(2)}</dd>
                </div>
              
            </div>

           
            <div className="bg-white border border-green-500 rounded-lg p-4">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Customer</h2>
              <p className="font-medium text-black">Name: {orderData.user.name}</p>
              <p className="text-sm text-gray-600">Email: {orderData.user.email}</p>
              
            </div>

            <div className="bg-white border border-green-500 rounded-lg p-4">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Shipping Address</h2>
              <address className="text-gray-600 not-italic">
                <p>{orderData.shippingAddress.street}</p>
                <p>{orderData.shippingAddress.city}, {orderData.shippingAddress.state}</p>
                <p>{orderData.shippingAddress.zipCod}</p>
              </address>
            </div>
            
            <div className="bg-white border border-green-500 rounded-lg p-4">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Billing Address</h2>
              <address className="text-gray-600 not-italic">
                <p>{orderData.billingAddress.street}</p>
                <p>{orderData.billingAddress.city}, {orderData.billingAddress.state}</p>
                <p>{orderData.billingAddress.zipCod}</p>
              </address>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}