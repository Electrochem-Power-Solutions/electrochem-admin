"use client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import Link from "next/link";

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
  items: {
    product_id: {
      _id: string;
      productName: string;
      image: string[];
    } | null;
    quantity: number;
    Price: number;
  }[];
}
const allStatuses: Order["status"][] = [
  "pending",
  "placed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];
const statusColorMap: Record<Order["status"], string> = {
  pending: "bg-yellow-100 border-yellow-300 text-yellow-800",
  placed: "bg-blue-100 border-blue-300 text-blue-800",
  processing: "bg-cyan-100 border-cyan-300 text-cyan-800",
  shipped: "bg-orange-100 border-orange-300 text-orange-800",
  delivered: "bg-green-100 border-green-300 text-green-800",
  cancelled: "bg-red-100 border-red-300 text-red-800",
};

export default function OrderPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState<Order["status"] | "all">(
    "all"
  );

  const [searchQuery, setSearchQuery] = useState("");

  const fetchOrders = async (
    fetchPage: number,
    fetchFilter: Order["status"] | "all",
    fetchSearchId: string
  ) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append("page", fetchPage.toString());
      if (fetchFilter !== "all") {
        params.append("status", fetchFilter);
      }
      if (fetchSearchId.trim() !== "") {
        // 3. Add to URL if it exists
        params.append("orderId", fetchSearchId.trim());
      }

      const data = await fetch(`/api/order?${params.toString()}`);
      if (!data.ok) {
        throw new Error("Failed to fetch orders");
      }
      const res = await data.json();

      if (fetchPage === 1) {
        setOrders(res.data);
      } else {
        setOrders((prevOrders) => [...prevOrders, ...res.data]);
      }
      setTotalPages(res.pagination.totalPages);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(1, "all", "");
  }, []);

  const handlefilterbyStatusUpdate = (status: Order["status"] | "all") => {
    setFilterStatus(status);
    setPage(1);
    fetchOrders(1, status, searchQuery);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchOrders(1, filterStatus, searchQuery);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setPage(1);
    fetchOrders(1, filterStatus, "");
  };

  const handleLoadMore = () => {
    setPage(page + 1);
    fetchOrders(page, filterStatus, searchQuery);
  };

  const handleStatusUpdate = async (
    orderId: string,
    newStatus: Order["status"]
  ) => {
    try {
      const payload = { status: newStatus, id: orderId };
      const response = await fetch("/api/order", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to update status");
      const data = await response.json();
      toast.success(data.message);

      if (filterStatus === "all" || newStatus === filterStatus) {
        setOrders((currentOrders) =>
          currentOrders.map((order) =>
            order._id === orderId ? { ...order, status: newStatus } : order
          )
        );
      } else {
        setOrders((currentOrders) =>
          currentOrders.filter((order) => order._id !== orderId)
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
      console.error("Failed to update status:", err);
    }
  };

  return (
    <>
      <div className="flex flex-col md:flex-row gap-4 p-4 max-w-4xl mx-auto">
        <div className="flex items-center gap-2">
          <label htmlFor="filterbyStatus" className="font-medium shrink-0">
            Filter By Status:
          </label>
          <select
            id="filterbyStatus"
            value={filterStatus}
            onChange={(e) =>
              handlefilterbyStatusUpdate(
                e.target.value as Order["status"] | "all"
              )
            }
            className={`py-2 px-2.5 rounded-md border font-semibold`}
          >
            <option value="all">All</option>
            {allStatuses.map((status) => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex-grow flex gap-2">
          <input
            type="text"
            placeholder="Search by Order ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-grow border border-gray-300 rounded-md p-2 text-sm"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold text-sm hover:bg-green-700"
          >
            Search
          </button>
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg font-semibold text-sm hover:bg-gray-600"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {loading && page === 1 && (
        <p className="text-center p-10">Loading orders...</p>
      )}
      {error && <p className="text-center p-10 text-red-600">Error: {error}</p>}
      {!loading && orders.length === 0 && (
        <p className="text-center p-10">No Orders Found</p>
      )}

      {orders.length > 0 && (
        <div className="flex flex-col gap-6 p-4 max-w-4xl mx-auto">
          {orders.map((order) => (
            <div
              key={order._id}
              className="bg-white border border-gray-200 rounded-lg shadow-md flex flex-col justify-between overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 p-4">
                
                <div>
                  <h3 className="m-0 text-sm font-semibold text-gray-800 break-all">
                    Order ID: {order._id}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Date: {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>

                
                <div>
                  <Link
                    href={`/order/${order._id}`}
                    className="inline-block rounded-md bg-white-600 border-1 border-green-600 px-3 py-0.5 text-s font-medium text-green-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2"
                  >
                    View Details
                  </Link>
                </div>
              </div>

              <div className="border-t border-gray-100 bg-gray-50 p-2 flex justify-between items-center">
                <div className="total-amount">
                  <p className="text-lg font-bold text-gray-900">
                    Total: ₹{order.totalAmount.toFixed(2)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <label
                    htmlFor={`status-${order._id}`}
                    className="text-sm font-medium text-gray-700"
                  >
                    Status:
                  </label>
                  <select
                    id={`status-${order._id}`}
                    value={order.status}
                    onChange={(e) =>
                      handleStatusUpdate(
                        order._id,
                        e.target.value as Order["status"]
                      )
                    }
                    className={`py-1 px-2.5 rounded-md border font-semibold ${
                      statusColorMap[order.status]
                    }`}
                  >
                    {allStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {order.status === "pending" && (
                <p className="mx-5 font-bold text-red-600">Send PI</p>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && page < totalPages && (
        <div className="text-center p-4">
          <button
            onClick={handleLoadMore}
            className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold shadow-md hover:bg-green-700 disabled:bg-gray-400"
          >
            Load More
          </button>
        </div>
      )}

      {loading && page > 1 && (
        <p className="text-center p-4 text-gray-600">Loading more orders...</p>
      )}
    </>
  );
}
