import { useAuth } from "../auth";

export default function Header() {
  const { me, logout } = useAuth();

  return (
    <header className="w-full bg-[#1a2238] text-white px-6 py-3 flex items-center justify-between shadow-md">
      <div className="text-lg font-semibold tracking-wide">
        Employee of the Month
      </div>

      {me && (
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-200 text-right">
            <div className="font-medium">{me.name}</div>
            <div className="text-xs opacity-80">{me.role}</div>
          </div>

          <button
            onClick={logout}
            className="text-sm bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded transition-colors"
          >
            Log out
          </button>
        </div>
      )}
    </header>
  );
}