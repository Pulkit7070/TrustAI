import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, CheckCircle, Truck, TrendingUp, ArrowLeft, Package, User, CreditCard } from 'lucide-react';

export default function MarketplaceDemo({ onBack }) {
    const [view, setView] = useState('marketplace'); // 'marketplace' | 'orders' | 'profile'

    // Mock Data
    const products = [
        { id: 1, name: "Urea Fertilizer", price: 600, image: "🌱" },
        { id: 2, name: "DAP Fertilizer", price: 1350, image: "🌾" },
        { id: 3, name: "Hybrid Seeds", price: 400, image: "🌽" },
        { id: 4, name: "Pesticide X", price: 850, image: "🧪" }
    ];

    const [cart, setCart] = useState([]);
    const [orders, setOrders] = useState([]);
    const [processing, setProcessing] = useState(false);

    const addToCart = (product) => {
        setCart([...cart, product]);
    };

    const placeOrder = async () => {
        setProcessing(true);

        // Simulate Backend Agent Work in Background
        try {
            // We'll mimic the agent flow but show it as user-friendly status updates
            const agentResponse = await fetch('http://localhost:8000/run-agents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    item: cart[0].name, // robustify for multiple items later
                    quantity: 50, // mock quantity
                    vendor_id: "V-9988",
                    farmer_id: "F-1024"
                })
            });
            const data = await agentResponse.json();

            if (data.status === 'success') {
                const newOrder = {
                    id: `ORD-${Math.floor(Math.random() * 10000)}`,
                    items: cart,
                    status: 'Approved & Paid',
                    date: new Date().toLocaleDateString(),
                    total: cart.reduce((sum, item) => sum + item.price, 0)
                };
                setOrders([newOrder, ...orders]);
                setCart([]);
                setView('orders');
            } else {
                alert("Order verification failed. Please try again.");
            }
        } catch (e) {
            console.error(e);
            alert("System busy. Agents are re-calibrating.");
        } finally {
            setProcessing(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-7xl mx-auto p-4 md:p-8 pt-24 min-h-screen flex flex-col"
        >
            {/* Header */}
            <header className="flex justify-between items-center mb-10">
                <button
                    onClick={onBack}
                    className="flex items-center text-white/50 hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    <span className="hidden md:inline">Back to Home</span>
                </button>
                <div className="flex gap-4">
                    <NavButton active={view === 'marketplace'} onClick={() => setView('marketplace')} icon={Package} label="Marketplace" />
                    <NavButton active={view === 'orders'} onClick={() => setView('orders')} icon={Truck} label="My Orders" />
                    <NavButton active={view === 'profile'} onClick={() => setView('profile')} icon={User} label="Profile" />
                </div>
            </header>

            {/* Content Area */}
            <div className="flex-1">
                {view === 'marketplace' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {products.map(product => (
                            <ProductCard key={product.id} product={product} onAdd={addToCart} />
                        ))}
                    </div>
                )}

                {view === 'orders' && (
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold mb-6">Order History</h2>
                        {orders.length === 0 ? (
                            <p className="text-white/40">No active orders.</p>
                        ) : (
                            orders.map(order => (
                                <div key={order.id} className="glass-panel p-6 rounded-xl flex justify-between items-center">
                                    <div>
                                        <h3 className="font-bold text-lg">{order.id}</h3>
                                        <p className="text-sm text-white/60">{order.items.length} items • {order.date}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[var(--cyber-green)] font-bold mb-1">{order.status}</p>
                                        <p className="text-xl font-bold">₹{order.total}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Cart Float */}
            <AnimatePresence>
                {cart.length > 0 && view === 'marketplace' && (
                    <motion.div
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        exit={{ y: 100 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-md glass-panel bg-black/80 backdrop-blur-xl p-4 rounded-2xl border border-[var(--cyber-green)] shadow-[0_0_30px_rgba(0,255,157,0.2)] flex items-center justify-between z-50"
                    >
                        <div className="flex items-center gap-4">
                            <div className="bg-[var(--cyber-green)] text-black font-bold w-10 h-10 rounded-full flex items-center justify-center">
                                {cart.length}
                            </div>
                            <div>
                                <p className="font-bold text-white">Cart Total</p>
                                <p className="text-sm text-gray-400">₹{cart.reduce((s, i) => s + i.price, 0)}</p>
                            </div>
                        </div>
                        <button
                            onClick={placeOrder}
                            disabled={processing}
                            className="bg-white text-black px-6 py-2 rounded-xl font-bold hover:bg-gray-200 transition-colors disabled:opacity-50"
                        >
                            {processing ? 'Processing...' : 'Checkout'}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

function NavButton({ active, onClick, icon: Icon, label }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${active ? 'bg-[var(--cyber-green)] text-black font-bold' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
        >
            <Icon className="w-4 h-4" />
            <span className="hidden md:inline">{label}</span>
        </button>
    );
}

function ProductCard({ product, onAdd }) {
    return (
        <div className="glass-card hover:scale-[1.02] transition-transform group">
            <div className="h-40 bg-white/5 rounded-lg mb-4 flex items-center justify-center text-6xl">
                {product.image}
            </div>
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="font-bold text-lg">{product.name}</h3>
                    <p className="text-[var(--cyber-green)] font-mono">₹{product.price}</p>
                </div>
            </div>
            <button
                onClick={() => onAdd(product)}
                className="w-full py-3 rounded-lg border border-white/20 hover:bg-white hover:text-black transition-all font-medium flex items-center justify-center gap-2"
            >
                Add to Cart
            </button>
        </div>
    );
}
