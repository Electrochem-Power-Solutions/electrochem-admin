import { NextRequest, NextResponse } from "next/server";
import { Order } from "../../../../models/order";
import { dbConnect } from "../../../../models/dbconnect";
import { Product } from "../../../../models/product";
import { User } from "../../../../models/user";
export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const url = req.nextUrl;
    const id = url.searchParams.get("orderId");
    // console.log(id)
    if (!id)
    return NextResponse.json({ message: "Invalid id" }, { status: 200 });
    const res = await Order.findById(id).populate([
    {
        path:'items.product_id',
        model:Product
    },
    {
        path:'user',
        model:User
    }
    ]).lean();

    return NextResponse.json({ data: res }, { status: 200 });
  } catch (err) {
    console.error(err);
    if (err instanceof Error) {
      return NextResponse.json(
        { message: "internal Server Error" },
        { status: 501 }
      );
    }
    return NextResponse.json({ message: "Unexpected Error" }, { status: 501 });
  }
}
