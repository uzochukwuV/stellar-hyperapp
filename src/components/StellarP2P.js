import React, { useState, useEffect } from 'react';
import {
  Zap, Shield, TrendingUp, Gift, Gamepad, Smartphone,
  Wifi, DollarSign, ArrowRight, Star, CheckCircle,
  AlertCircle, Clock, Search, Filter, Plus, Send,
  X, ExternalLink, Copy, Check, ChevronDown, Users,
  Award, Activity, BarChart3, Sparkles
} from 'lucide-react';

const StellarP2P = () => {
  const [activeTab, setActiveTab] = useState('marketplace');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [walletConnected, setWalletConnected] = useState(false);
  const [currentAddress, setCurrentAddress] = useState('');
  const [showCreateOffer, setShowCreateOffer] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Mock data for demonstration
  const categories = [
    { id: 'all', name: 'All Offers', icon: Sparkles, count: 247 },
    { id: 'airtime', name: 'Airtime & Data', icon: Smartphone, count: 89 },
    { id: 'giftcards', name: 'Gift Cards', icon: Gift, count: 65 },
    { id: 'gaming', name: 'Gaming', icon: Gamepad, count: 43 },
    { id: 'utilities', name: 'Utilities', icon: Wifi, count: 32 },
    { id: 'services', name: 'Services', icon: Users, count: 18 },
  ];

  const offers = [
    {
      id: 1,
      vendor: 'GBXG...K7PQ',
      vendorRep: 98,
      title: 'Amazon $50 Gift Card',
      category: 'giftcards',
      price: 50,
      collateral: 60,
      delivery: 'Instant',
      trades: 234,
      badge: 'Top Seller'
    },
    {
      id: 2,
      vendor: 'GCYT...M9LP',
      vendorRep: 95,
      title: 'MTN 5GB Data Plan',
      category: 'airtime',
      price: 15,
      collateral: 18,
      delivery: '< 5 mins',
      trades: 412,
      badge: 'Fast'
    },
    {
      id: 3,
      vendor: 'GDAL...N3QW',
      vendorRep: 100,
      title: 'PUBG 3000 UC',
      category: 'gaming',
      price: 30,
      collateral: 36,
      delivery: 'Instant',
      trades: 156,
      badge: 'Verified'
    },
    {
      id: 4,
      vendor: 'GAXP...R8YZ',
      vendorRep: 92,
      title: 'Steam $25 Wallet Code',
      category: 'giftcards',
      price: 25,
      collateral: 30,
      delivery: 'Instant',
      trades: 89,
      badge: null
    },
    {
      id: 5,
      vendor: 'GBMK...F4TY',
      vendorRep: 97,
      title: 'Airtel 10GB Data',
      category: 'airtime',
      price: 20,
      collateral: 24,
      delivery: '< 10 mins',
      trades: 201,
      badge: 'Fast'
    },
    {
      id: 6,
      vendor: 'GCER...P5NX',
      vendorRep: 99,
      title: 'Netflix Premium 1 Month',
      category: 'giftcards',
      price: 12,
      collateral: 14.4,
      delivery: 'Instant',
      trades: 387,
      badge: 'Top Seller'
    },
  ];

  const myTrades = [
    {
      id: 1,
      offer: 'Amazon $50 Gift Card',
      vendor: 'GBXG...K7PQ',
      amount: 50,
      status: 'delivered',
      time: '2 mins ago'
    },
    {
      id: 2,
      offer: 'MTN 5GB Data',
      vendor: 'GCYT...M9LP',
      amount: 15,
      status: 'funded',
      time: '15 mins ago'
    },
  ];

  const stats = {
    totalVolume: '$127.5K',
    totalTrades: 1243,
    avgCompletionTime: '3.2 mins',
    successRate: '99.2%'
  };

  const connectWallet = async () => {
    // Mock wallet connection
    setWalletConnected(true);
    setCurrentAddress('GBXG...K7PQ');
  };

  const copyAddress = () => {
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const filteredOffers = offers.filter(offer => {
    const matchesCategory = selectedCategory === 'all' || offer.category === selectedCategory;
    const matchesSearch = offer.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-blue-500/10 to-transparent rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10">
        {/* Navigation */}
        <nav className="border-b border-white/10 backdrop-blur-xl bg-black/20">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center rotate-3 hover:rotate-6 transition-transform">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                    StellarP2P
                  </h1>
                  <p className="text-xs text-gray-400">Bonded Escrow Marketplace</p>
                </div>
              </div>

              {/* Wallet Button */}
              <div>
                {!walletConnected ? (
                  <button
                    onClick={connectWallet}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl font-medium transition-all transform hover:scale-105 hover:shadow-xl hover:shadow-purple-500/50 flex items-center space-x-2"
                  >
                    <Shield className="w-5 h-5" />
                    <span>Connect Wallet</span>
                  </button>
                ) : (
                  <div className="flex items-center space-x-3">
                    <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-white font-medium">{currentAddress}</span>
                      <button onClick={copyAddress} className="text-gray-400 hover:text-white transition-colors">
                        {copiedAddress ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <button
                      onClick={() => setShowCreateOffer(true)}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl font-medium transition-all transform hover:scale-105 flex items-center space-x-2"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Create Offer</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Stats */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Volume', value: stats.totalVolume, icon: DollarSign, color: 'from-green-500 to-emerald-500' },
              { label: 'Total Trades', value: stats.totalTrades, icon: Activity, color: 'from-blue-500 to-cyan-500' },
              { label: 'Avg Completion', value: stats.avgCompletionTime, icon: Clock, color: 'from-purple-500 to-pink-500' },
              { label: 'Success Rate', value: stats.successRate, icon: Award, color: 'from-orange-500 to-red-500' },
            ].map((stat, idx) => (
              <div key={idx} className="group relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm p-6 hover:bg-white/10 transition-all hover:scale-105 hover:shadow-xl">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br opacity-20 blur-2xl group-hover:opacity-30 transition-opacity" style={{background: `linear-gradient(135deg, ${stat.color})`}}></div>
                <div className="relative">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-sm text-gray-400">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-2 bg-white/5 border border-white/10 rounded-xl p-1.5 backdrop-blur-sm w-fit">
            {['marketplace', 'my-trades', 'my-offers'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          {activeTab === 'marketplace' && (
            <div className="space-y-6">
              {/* Search & Filter Bar */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search offers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm transition-all"
                  />
                </div>
                <div className="flex gap-2">
                  <button className="px-6 py-4 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition-all backdrop-blur-sm flex items-center space-x-2">
                    <Filter className="w-5 h-5" />
                    <span>Filter</span>
                  </button>
                </div>
              </div>

              {/* Categories */}
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center space-x-2 px-5 py-3 rounded-xl font-medium whitespace-nowrap transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/50'
                        : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white backdrop-blur-sm'
                    }`}
                  >
                    <cat.icon className="w-4 h-4" />
                    <span>{cat.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      selectedCategory === cat.id ? 'bg-white/20' : 'bg-white/10'
                    }`}>
                      {cat.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Offers Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredOffers.map((offer) => (
                  <div
                    key={offer.id}
                    className="group relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/20"
                  >
                    {/* Badge */}
                    {offer.badge && (
                      <div className="absolute top-4 right-4 z-10">
                        <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${
                          offer.badge === 'Top Seller' ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                          offer.badge === 'Fast' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                          'bg-gradient-to-r from-blue-500 to-cyan-500'
                        } text-white shadow-lg`}>
                          <Sparkles className="w-3 h-3" />
                          <span>{offer.badge}</span>
                        </div>
                      </div>
                    )}

                    <div className="p-6">
                      {/* Vendor Info */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                            {offer.vendor[0]}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">{offer.vendor}</div>
                            <div className="flex items-center space-x-1">
                              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                              <span className="text-xs text-gray-400">{offer.vendorRep}% · {offer.trades} trades</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Offer Title */}
                      <h3 className="text-xl font-bold text-white mb-4 group-hover:text-purple-400 transition-colors">
                        {offer.title}
                      </h3>

                      {/* Price & Collateral */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                          <div className="text-xs text-gray-400 mb-1">Price</div>
                          <div className="text-lg font-bold text-white">${offer.price}</div>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                          <div className="text-xs text-gray-400 mb-1">Collateral</div>
                          <div className="text-lg font-bold text-green-400">${offer.collateral}</div>
                        </div>
                      </div>

                      {/* Delivery Time */}
                      <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
                        <div className="flex items-center space-x-2 text-sm text-gray-400">
                          <Clock className="w-4 h-4" />
                          <span>{offer.delivery}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-sm text-green-400">
                          <CheckCircle className="w-4 h-4" />
                          <span>Escrow</span>
                        </div>
                      </div>

                      {/* Action Button */}
                      <button className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl font-medium transition-all transform group-hover:scale-105 flex items-center justify-center space-x-2 shadow-lg">
                        <span>Buy Now</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'my-trades' && (
            <div className="space-y-4">
              {myTrades.map((trade) => (
                <div key={trade.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm hover:bg-white/10 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-2">{trade.offer}</h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-400">
                        <span>Vendor: {trade.vendor}</span>
                        <span>·</span>
                        <span>${trade.amount}</span>
                        <span>·</span>
                        <span>{trade.time}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className={`px-4 py-2 rounded-xl text-sm font-medium ${
                        trade.status === 'delivered' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                        trade.status === 'funded' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                        'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      }`}>
                        {trade.status.charAt(0).toUpperCase() + trade.status.slice(1)}
                      </div>
                      {trade.status === 'delivered' && (
                        <button className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl font-medium transition-all">
                          Confirm
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'my-offers' && (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Gift className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">No Offers Yet</h3>
              <p className="text-gray-400 mb-6">Start selling by creating your first offer</p>
              <button
                onClick={() => setShowCreateOffer(true)}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl font-medium transition-all transform hover:scale-105 inline-flex items-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>Create Offer</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create Offer Modal */}
      {showCreateOffer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-gradient-to-br from-slate-900 to-purple-900/50 border border-white/20 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  Create New Offer
                </h2>
                <button
                  onClick={() => setShowCreateOffer(false)}
                  className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-400 hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                  <select className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                    <option>Gift Cards</option>
                    <option>Airtime & Data</option>
                    <option>Gaming</option>
                    <option>Utilities</option>
                    <option>Services</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                  <input
                    type="text"
                    placeholder="e.g., Amazon $50 Gift Card"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                  <textarea
                    rows="3"
                    placeholder="Describe your offer..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Price (USDC)</label>
                    <input
                      type="number"
                      placeholder="50"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Collateral (USDC)</label>
                    <input
                      type="number"
                      placeholder="60 (120%)"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">Minimum 120% of price</p>
                  </div>
                </div>

                <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                  <div className="flex items-start space-x-3">
                    <Shield className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-gray-300">
                      <p className="font-medium text-purple-400 mb-1">Escrow Protection</p>
                      <p>Your collateral is locked in a smart contract. If you fail to deliver, the buyer claims it automatically.</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateOffer(false)}
                    className="flex-1 px-6 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl font-medium transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl font-medium transition-all transform hover:scale-105 shadow-xl"
                  >
                    Create Offer
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StellarP2P;
