import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Profile from "./components/Profile";
import EditProfile from "./components/EditProfile";
import TradeApply from "./components/TradeApply";
import TradeList from "./components/TradeList";
import MyTrades from "./components/MyTrades";
import Login from "./components/Login";
import Signup from "./components/Signup";
import NotFound from "./components/404";
import CloseRequests from "./components/CloseRequests";
import ClosedTrades from "./components/ClosedTrades";
import SettlementModal from "./components/SettlementModal";
import TradeListAndSettlement from "./components/TradeListAndSettlement";
import TradesTable from "./components/TradeTable";
function App() {
  return (
    <Router>
      <Navbar />
      <div className="p-6">
        <Routes>
          <Route path="/" element={<TradeList />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/edit" element={<EditProfile />} />
          <Route path="/apply-trade" element={<TradeApply />} />
          <Route path="/my-trades" element={<MyTrades />} />
          <Route path="/closed" element={<ClosedTrades />} />
          <Route path="/close_req" element={<CloseRequests />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/settlement_price" element={<SettlementModal />} />
          <Route path="/settlement" element={<TradesTable />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      <Footer />
    </Router>
  );
}

export default App;
