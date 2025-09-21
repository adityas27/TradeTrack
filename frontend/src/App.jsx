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
import TradesTable from "./components/TradeTable";

// New components
import CreateExitForm from "./components/CreateExitForm";
import ManagerExit from "./components/ManagerExit";
import MyExitList from "./components/MyExitList";
import Home from "./components/Home";
import FlyTradeList from "./components/FlyTrade/FlyTradeList";
import CreateFlyTrade from "./components/FlyTrade/CreateFlyTrade";
import FlyTradeExits from "./components/FlyTrade/FlyTradeExits";
import MyFlyTrades from "./components/FlyTrade/MyFlyTrades";

function App() {
  return (
    <Router>
      <Navbar />
      <div className="p-6">
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/" element={<Home />} /> 
          <Route path="/manager" element={<TradeList />} /> 
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/edit" element={<EditProfile />} />
          <Route path="/apply-trade" element={<TradeApply />} />
          <Route path="/my-trades" element={<MyTrades />} />
          <Route path="/closed" element={<ClosedTrades />} />
          <Route path="/close_req" element={<CloseRequests />} />
          <Route path="/settlement" element={<TradesTable />} />
          <Route path="/create-exit" element={<CreateExitForm />} />
          <Route path="/manager-exit" element={<ManagerExit />} />
          <Route path="/my-exits" element={<MyExitList />} />

          {/* FlyTrade Routes */}
          <Route path="/fly/manager" element={<FlyTradeList />} />
          <Route path="/fly/create" element={<CreateFlyTrade />} />
          <Route path="/fly/exits" element={<FlyTradeExits />} />
          <Route path="/fly/my" element={<MyFlyTrades />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      <Footer />
    </Router>
  );
}

export default App;
