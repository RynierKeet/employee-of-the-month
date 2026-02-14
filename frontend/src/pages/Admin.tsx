import { useEffect, useState } from "react";

interface Employee {
  id: number;
  name: string;
  email?: string;
  role?: string;
}

export default function Admin() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("employee");

  const [month, setMonth] = useState("2026-02");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Load employees
  const loadEmployees = () => {
    fetch("http://localhost:3000/employees")
      .then((res) => res.json())
      .then((data: Employee[]) => setEmployees(data))
      .catch(() => setMessage("Failed to load employees"));
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  // Add employee
  const addEmployee = () => {
    setMessage("");

    if (!name.trim()) {
      setMessage("Name is required.");
      return;
    }

    fetch("http://localhost:3000/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, role }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setMessage(data.error);
        else {
          setMessage("Employee added.");
          setName("");
          setEmail("");
          setRole("employee");
          loadEmployees();
        }
      })
      .catch(() => setMessage("Server error while adding employee."));
  };

  // Delete employee
  const deleteEmployee = (id: number) => {
    if (!confirm("Delete this employee?")) return;

    fetch(`http://localhost:3000/employees/${id}`, {
      method: "DELETE",
    })
      .then((res) => res.json())
      .then(() => loadEmployees())
      .catch(() => setMessage("Failed to delete employee."));
  };

  // Reset month (still allowed)
  const resetMonth = async () => {
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:3000/admin/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month_key: month }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage("Month reset successfully.");
      } else {
        setMessage(data.error || "Failed to reset month.");
      }
    } catch {
      setMessage("Server error while resetting month.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow-card border border-slate-200 rounded-card p-8 space-y-10 max-w-3xl mx-auto">
      <h2 className="text-2xl font-semibold text-slate-900">Admin — Employee Management</h2>

      {/* Add Employee */}
      <div className="border border-slate-200 rounded-card p-6 space-y-4 bg-slate-50">
        <p className="text-lg font-medium text-slate-900">Add Employee</p>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-800">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-slate-300 rounded-card px-3 py-2
                       focus:outline-none focus:ring-2 focus:ring-crgGold"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-800">Email (optional)</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-slate-300 rounded-card px-3 py-2
                       focus:outline-none focus:ring-2 focus:ring-crgGold"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-800">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full border border-slate-300 rounded-card px-3 py-2
                       focus:outline-none focus:ring-2 focus:ring-crgGold"
          >
            <option value="employee">Employee</option>
            <option value="adjudicator">Adjudicator</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <button
          onClick={addEmployee}
          className="px-6 py-3 rounded-card font-medium text-white bg-brandnavy
                     hover:bg-slate-800 hover:text-crgGold transition"
        >
          Add Employee
        </button>

        {message && <p className="text-sm text-slate-800">{message}</p>}
      </div>

      {/* Employee List */}
      <div className="border border-slate-200 rounded-card p-6 space-y-4">
        <p className="text-lg font-medium text-slate-900">Employees</p>

        {employees.map((e) => (
          <div
            key={e.id}
            className="flex justify-between items-center px-4 py-2 rounded-card
                       border border-slate-200 bg-slate-50"
          >
            <div>
              <p className="font-medium text-slate-800">{e.name}</p>
              <p className="text-xs text-slate-600">{e.email}</p>
              <p className="text-xs text-slate-600">Role: {e.role || "employee"}</p>
            </div>

            <button
              onClick={() => deleteEmployee(e.id)}
              className="px-4 py-2 rounded-card bg-red-600 text-white text-sm
                         hover:bg-red-700 transition"
            >
              Delete
            </button>
          </div>
        ))}

        {employees.length === 0 && (
          <p className="text-sm text-slate-700">No employees found.</p>
        )}
      </div>

      {/* Reset Month */}
      <div className="border border-slate-200 rounded-card p-6 space-y-4 bg-slate-50">
        <p className="text-lg font-medium text-slate-900">Reset Month</p>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-800">Month</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-full border border-slate-300 rounded-card px-3 py-2
                       focus:outline-none focus:ring-2 focus:ring-crgGold"
          />
        </div>

        <button
          onClick={resetMonth}
          disabled={loading}
          className="px-6 py-3 rounded-card font-medium text-white bg-red-600
                     hover:bg-red-700 transition disabled:opacity-50"
        >
          Reset Month (Danger)
        </button>
      </div>
    </div>
  );
}