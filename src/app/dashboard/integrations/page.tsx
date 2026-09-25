"use client";

import { useEffect, useState } from "react";
import { Key, Plus, Trash2, Shield, Eye, Copy, Check, Info, Loader2 } from "lucide-react";

interface ApiKeyRecord {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  isActive: boolean;
  lastUsedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
}

export default function IntegrationsPage() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["generate_documents", "view_documents"]);
  const [newKeyDetails, setNewKeyDetails] = useState<{ key: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const availableScopes = [
    { value: "generate_documents", label: "Generate Documents", desc: "Allows programmatically generating documents from templates." },
    { value: "view_documents", label: "View Documents", desc: "Allows fetching document details and verification status." },
    { value: "manage_data", label: "Manage Data Records", desc: "Allows importing and updating business data records." },
  ];

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = () => {
    setIsLoading(true);
    fetch("/api/keys")
      .then((r) => r.json())
      .then((data) => setKeys(data.keys || []))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) return;

    setIsCreating(true);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: keyName, scopes }),
      });
      const data = await res.json();
      if (data.success && data.key) {
        setNewKeyDetails({ key: data.key.key, name: data.key.name });
        setKeyName("");
        fetchKeys();
      } else {
        alert(data.error || "Failed to create API key.");
      }
    } catch {
      alert("An error occurred.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this API key? This action is permanent and immediate.")) return;

    try {
      const res = await fetch(`/api/keys?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchKeys();
      }
    } catch {}
  };

  const copyToClipboard = () => {
    if (!newKeyDetails) return;
    navigator.clipboard.writeText(newKeyDetails.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleScope = (scope: string) => {
    if (scopes.includes(scope)) {
      setScopes(scopes.filter((s) => s !== scope));
    } else {
      setScopes([...scopes, scope]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
            <Key className="w-6 h-6 text-amber-600" />
          </div>
          Integrations & API Keys
        </h2>
        <p className="text-slate-500 font-medium mt-2">
          Generate secure tokens to programmatically automate document production from your custom workflows.
        </p>
      </div>

      {/* New Key Result Modal */}
      {newKeyDetails && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-6 space-y-4">
          <h3 className="font-black text-amber-800 flex items-center gap-2">
            <Shield className="w-5 h-5" /> API Key Created Successfully!
          </h3>
          <p className="text-sm text-amber-700">
            Make sure to copy this key now. For your security, **we cannot show it to you again**.
          </p>
          <div className="flex items-center gap-2 bg-white border border-amber-200 rounded-xl p-3">
            <code className="flex-1 font-mono text-xs text-slate-800 break-all select-all">{newKeyDetails.key}</code>
            <button
              onClick={copyToClipboard}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
              title="Copy to clipboard"
            >
              {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
          <button
            onClick={() => setNewKeyDetails(null)}
            className="bg-amber-600 text-white font-bold text-sm px-4 py-2 rounded-lg hover:bg-amber-700 transition"
          >
            I have saved the key
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left: Create Form */}
        <div className="md:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 h-fit">
          <h3 className="font-black text-slate-800 text-lg">Generate Key</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Key Name</label>
              <input
                type="text"
                placeholder="e.g. Production Automation"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Scopes</label>
              <div className="space-y-2">
                {availableScopes.map((scope) => (
                  <label key={scope.value} className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scopes.includes(scope.value)}
                      onChange={() => toggleScope(scope.value)}
                      className="mt-1 border-slate-300 rounded text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-700">{scope.label}</p>
                      <p className="text-[10px] text-slate-400 font-medium leading-normal mt-0.5">{scope.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isCreating || !keyName.trim() || scopes.length === 0}
              className="w-full bg-gradient-to-br from-amber-500 to-amber-700 text-white font-bold text-sm py-2.5 rounded-xl transition hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {isCreating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Create API Key"}
            </button>
          </form>
        </div>

        {/* Right: Key List */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-fit">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-black text-slate-800">Active API Keys</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {isLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
              </div>
            ) : keys.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-bold text-sm">
                No active API keys found. Generate one on the left.
              </div>
            ) : (
              keys.map((key) => (
                <div key={key.id} className="p-6 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-800">{key.name}</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600 border border-slate-200">
                        {key.keyPrefix}••••••••
                      </code>
                      {!key.isActive && (
                        <span className="text-[10px] bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded font-bold">
                          REVOKED
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {key.scopes.map((s) => (
                        <span key={s} className="bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded">
                          {s}
                        </span>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400 pt-1">
                      Created on {new Date(key.createdAt).toLocaleDateString()}
                      {key.lastUsedAt && ` · Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  {key.isActive && (
                    <button
                      onClick={() => handleRevoke(key.id)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Revoke key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
