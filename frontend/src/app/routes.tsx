import { createBrowserRouter, Outlet } from "react-router";
import { Header } from "./components/Header";
import { HomePage } from "./pages/HomePage";
import { SearchResultsPage } from "./pages/SearchResultsPage";
import { RestaurantDetailPage } from "./pages/RestaurantDetailPage";
import { ProfilePage } from "./pages/ProfilePage";
import { OwnerRestaurantListPage } from "./pages/OwnerRestaurantListPage";
import { RegisterRestaurantPage } from "./pages/RegisterRestaurantPage";
import { ManageRestaurantPage } from "./pages/ManageRestaurantPage";
import { WriteReviewPage } from "./pages/WriteReviewPage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { ChatPage } from "./pages/ChatPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";

function RootLayout() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Outlet />
      </main>
    </div>
  );
}

function AuthLayout() {
  return (
    <div className="min-h-screen">
      <Outlet />
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">🍜</div>
        <h1 className="text-gray-900 mb-2">404 - ページが見つかりません</h1>
        <p className="text-gray-500 mb-6">お探しのページは見つかりませんでした。</p>
        <a
          href="/"
          className="px-6 py-3 text-white rounded-xl text-sm transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #0066CC 0%, #004499 100%)" }}
        >
          ホームに戻る
        </a>
      </div>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: HomePage },
      { path: "search", Component: SearchResultsPage },
      { path: "restaurant/:id", Component: RestaurantDetailPage },
      { path: "profile", Component: ProfilePage },
      { path: "owner/restaurants", Component: OwnerRestaurantListPage },
      { path: "owner/register", Component: RegisterRestaurantPage },
      { path: "owner/manage/:id", Component: ManageRestaurantPage },
      { path: "review/:id", Component: WriteReviewPage },
      { path: "chat", Component: ChatPage },
      { path: "login", Component: LoginPage },
      { path: "signup", Component: SignupPage },
      { path: "forgot-password", Component: ForgotPasswordPage },
      { path: "reset-password", Component: ResetPasswordPage },
      { path: "*", Component: NotFound },
    ],
  },
]);
