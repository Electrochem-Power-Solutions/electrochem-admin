import { Order } from "../../../../models/order";
import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "../../../../models/dbconnect";


interface Query {
  status?: string;
  _id?: string; 
}

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const params = req.nextUrl.searchParams;
    const status = params.get("status");
    const orderId = params.get("orderId"); 
    const page = parseInt(params.get("page") || "1");
    const limit = parseInt(params.get("limit") || "10");
    const skip = (page - 1) * limit;

   
    let query: Query = {};
    if (status && status !== "all") {
      query.status = status;
    }
    
    
    if (orderId) {
      query._id = orderId;
    }

   
    const data = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / limit);

    return NextResponse.json(
      {
        data,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalOrders: totalOrders,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Server Error" }, { status: 501 });
  }
}


export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const { status, id } = body;

    if (!status || !id) {
      return NextResponse.json({ message: "Invalid Data" }, { status: 400 });
    }

    await Order.findByIdAndUpdate(id, { status: status });

    return NextResponse.json({ message: "Status Updated " }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Server Error" }, { status: 501 });
  }
}