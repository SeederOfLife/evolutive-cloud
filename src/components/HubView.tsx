import { Search, ChevronUp, Play, Zap, Loader2, Trash2, GitFork } from "lucide-react";
import type { Suggestion } from "../types";

export interface HubViewProps {
  suggestions: Suggestion[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterType: "all" | "built" | "pending" | "mine";
  setFilterType: (f: "all" | "built" | "pending" | "mine") => void;
  user: any;
  isCreator: boolean;
  isBuilding: string | null;
  isRefining: string | null;
  isLoading: boolean;
  onBuild: (s: Suggestion) => void;
  onLaunch: (s: Suggestion) => void;
  onFork: (s: Suggestion) => void;
  onDelete: (id: string) => void;
  onVote: (id: string, votes: number) => void;
}

export function HubView({
  suggestions, searchQuery, setSearchQuery, filterType, setFilterType,
  user, isCreator, isBuilding, isRefining, isLoading, onBuild, onLaunch, onFork, onDelete, onVote,
}: HubViewProps) {
  return (
    <div className="h-full flex flex-col bg-gray-950">
      {/* Toolbar */}
      <div className="flex-none p-4 border-b border-gray-800 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search apps..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        <div className="flex gap-1 bg-gray-800 rounded-lg p-1 shrink-0">
          {(["all", "built", "pending", "mine"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterType(f)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                filterType === f ? "bg-indigo-500 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Column headers */}
      <div className="flex-none hidden sm:grid grid-cols-[1fr_72px_96px_180px] gap-3 px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-800">
        <span>Title</span>
        <span className="text-center">Type</span>
        <span className="text-center">Status</span>
        <span className="text-right">Actions</span>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto">
        {suggestions.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-600">
            <Search className="w-10 h-10" />
            <p className="text-sm">No apps found</p>
          </div>
        )}
        {suggestions.map((s) => {
          const isBuilt = s.status === "built";
          const isDemo = s.user_id === '@evolutive_demo';
          const isOwner = !isDemo && (s.user_id === user?.uid || isCreator);
          return (
            <div key={s.id} className="border-b border-gray-800/50 hover:bg-gray-900 transition-colors">
              {/* Mobile card */}
              <div className="sm:hidden flex flex-col gap-3 px-4 py-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-white font-medium leading-snug">{s.content}</p>
                      {isDemo && <span className="shrink-0 px-1.5 py-0.5 bg-violet-500/20 text-violet-400 rounded text-[9px] font-black uppercase tracking-wider border border-violet-500/30">DEMO</span>}
                    </div>
                    {s.parent_id && <p className="text-[10px] text-indigo-400/60 font-mono mt-0.5">forked from #{s.parent_id.substring(0, 8)}</p>}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="px-2 py-0.5 bg-gray-800 rounded text-[10px] text-gray-400">{s.app_type || "desktop"}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${isBuilt ? "bg-indigo-500/20 text-indigo-400" : "bg-gray-800 text-gray-400"}`}>{s.status}</span>
                    </div>
                  </div>
                  {isOwner && (
                    <button onClick={() => onDelete(s.id)} disabled={isLoading} className="p-2 bg-gray-800 hover:bg-red-900/40 rounded-lg text-gray-600 hover:text-red-400 transition-all disabled:opacity-40 shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  {isBuilt ? (
                    <button onClick={() => onLaunch(s)} className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-xl text-sm font-semibold text-white transition-all min-h-[44px]">
                      <Play className="w-4 h-4 fill-current" />Launch
                    </button>
                  ) : (
                    <button onClick={() => onBuild(s)} disabled={!!isBuilding || !!isRefining} className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-sm font-semibold text-white transition-all min-h-[44px]">
                      {isBuilding === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}Build
                    </button>
                  )}
                  {isBuilt && (
                    <button onClick={() => onFork(s)} className="flex items-center justify-center gap-1.5 px-3 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm text-gray-400 hover:text-white transition-all min-h-[44px]" title="Fork this app">
                      <GitFork className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => onVote(s.id, s.votes || 0)} className="flex items-center justify-center gap-1.5 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm text-gray-400 hover:text-white transition-all min-h-[44px]">
                    <ChevronUp className="w-4 h-4" /><span className="font-medium">{s.votes || 0}</span>
                  </button>
                </div>
              </div>

              {/* Desktop row */}
              <div className="hidden sm:grid grid-cols-[1fr_72px_96px_180px] gap-3 items-center px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-white font-medium truncate">{s.content}</p>
                    {isDemo && <span className="shrink-0 px-1.5 py-0.5 bg-violet-500/20 text-violet-400 rounded text-[9px] font-black uppercase tracking-wider border border-violet-500/30">DEMO</span>}
                  </div>
                  <p className="text-xs text-gray-600 font-mono">
                    #{s.id.substring(0, 8)}
                    {s.parent_id && <span className="ml-2 text-indigo-400/60">forked from #{s.parent_id.substring(0, 8)}</span>}
                  </p>
                </div>
                <div className="flex justify-center">
                  <span className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-400">{s.app_type || "desktop"}</span>
                </div>
                <div className="flex justify-center overflow-hidden">
                  <span className={`px-2 py-1 rounded text-xs font-medium truncate max-w-full ${isBuilt ? "bg-indigo-500/20 text-indigo-400" : "bg-gray-800 text-gray-400"}`}>{s.status}</span>
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  {isBuilt ? (
                    <button onClick={() => onLaunch(s)} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 rounded text-xs font-medium text-white transition-all">
                      <Play className="w-3 h-3 fill-current" />Launch
                    </button>
                  ) : (
                    <button onClick={() => onBuild(s)} disabled={!!isBuilding || !!isRefining} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed rounded text-xs font-medium text-white transition-all">
                      {isBuilding === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}Build
                    </button>
                  )}
                  {isBuilt && (
                    <button onClick={() => onFork(s)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs font-medium text-gray-400 hover:text-white transition-all" title="Fork this app">
                      <GitFork className="w-3 h-3" />Fork
                    </button>
                  )}
                  <button onClick={() => onVote(s.id, s.votes || 0)} className="flex items-center gap-1 px-2 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs text-gray-400 hover:text-white transition-all">
                    <ChevronUp className="w-3 h-3" />{s.votes || 0}
                  </button>
                  {isOwner && (
                    <button onClick={() => onDelete(s.id)} disabled={isLoading} className="p-1.5 bg-gray-800 hover:bg-red-900/40 rounded text-gray-600 hover:text-red-400 transition-all disabled:opacity-40" title="Delete">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
