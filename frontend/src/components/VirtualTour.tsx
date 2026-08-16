"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Move,
  Compass,
  ChevronLeft,
  ChevronRight,
  Camera,
  Image as ImageIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

interface RoomData {
  name: string;
  image: string;
  description: string;
  hotspots: Array<{
    id: string;
    label: string;
    targetRoom: string;
    x: number; // percentage from left
    y: number; // percentage from top
  }>;
}

interface ImageDetail {
  url: string;
  category: "Living Room" | "Bedroom" | "Kitchen" | "Bathroom" | "Exterior" | "Other";
  order: number;
  isCover: boolean;
}

interface VirtualTourProps {
  tourData?: {
    enabled: boolean;
    rooms: Array<{
      id: string;
      name: string;
      panorama: string;
      hotspots?: Array<{
        pitch: number;
        yaw: number;
        type: "info" | "scene";
        text: string;
        targetRoomId?: string;
      }>;
    }>;
  };
  imageDetails?: ImageDetail[];
  images?: string[];
}

export default function VirtualTour({ tourData, imageDetails, images }: VirtualTourProps) {
  // --- Mode Determination ---
  const is360Mode = useMemo(() => {
    return !!(tourData?.enabled && tourData.rooms && tourData.rooms.length > 0);
  }, [tourData]);

  const hasPhotos = useMemo(() => {
    return !!(
      (imageDetails && imageDetails.length > 0) ||
      (images && images.length > 0)
    );
  }, [imageDetails, images]);

  const mode = is360Mode ? "360" : hasPhotos ? "2d" : "empty";

  // --- States ---
  const [zoom, setZoom] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const viewerRef = useRef<HTMLDivElement>(null);
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const viewerInstance = useRef<any>(null);
  const [scriptStatus, setScriptStatus] = useState(() => {
    if (typeof window === "undefined") return "loading";
    const jsSrc = "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js";
    const script = document.querySelector(`script[src="${jsSrc}"]`) as HTMLScriptElement;
    if (script) {
      return script.getAttribute("data-status") || "ready";
    }
    return "loading";
  });

  // Load Pannellum Assets dynamically
  useEffect(() => {
    if (mode !== "360") return;

    // Load CSS
    const cssId = "pannellum-css";
    if (!document.getElementById(cssId)) {
      const link = document.createElement("link");
      link.id = cssId;
      link.rel = "stylesheet";
      link.href = "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css";
      document.head.appendChild(link);
    }

    // Load JS
    const jsSrc = "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js";
    let script = document.querySelector(`script[src="${jsSrc}"]`) as HTMLScriptElement;
    if (!script) {
      script = document.createElement("script");
      script.src = jsSrc;
      script.async = true;
      script.setAttribute("data-status", "loading");
      document.body.appendChild(script);

      const setAttributeFromEvent = (event: Event) => {
        const status = event.type === "load" ? "ready" : "error";
        script.setAttribute("data-status", status);
        setScriptStatus(status);
      };

      script.addEventListener("load", setAttributeFromEvent);
      script.addEventListener("error", setAttributeFromEvent);
    } else {
      const status = script.getAttribute("data-status") || "ready";
      if (status === "loading") {
        const setAttributeFromEvent = (event: Event) => {
          setScriptStatus(event.type === "load" ? "ready" : "error");
        };
        script.addEventListener("load", setAttributeFromEvent);
        script.addEventListener("error", setAttributeFromEvent);
      }
    }
  }, [mode]);

  // Fullscreen escape handler
  useEffect(() => {
    const handleFSChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFSChange);
    return () => document.removeEventListener("fullscreenchange", handleFSChange);
  }, []);

  const toggleFullscreen = () => {
    if (!viewerRef.current) return;
    if (!isFullscreen) {
      if (viewerRef.current.requestFullscreen) {
        viewerRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  const handleZoom = (direction: "in" | "out") => {
    if (mode === "360") {
      if (!viewerInstance.current) return;
      const currentHfov = viewerInstance.current.getHfov();
      const newHfov = direction === "in" ? Math.max(30, currentHfov - 15) : Math.min(120, currentHfov + 15);
      viewerInstance.current.setHfov(newHfov);
    } else {
      setZoom((prev) => {
        if (direction === "in") return Math.min(2.5, prev + 0.25);
        return Math.max(1, prev - 0.25);
      });
    }
  };

  // ==========================================
  // 1. 360 PANORAMA VIEWER IMPLEMENTATION
  // ==========================================
  const activeRooms360 = useMemo(() => {
    if (tourData?.rooms) {
      return tourData.rooms.reduce((acc, r) => {
        acc[r.id] = {
          name: r.name,
          image: r.panorama,
          description: "",
          hotspots: (r.hotspots || []).map((h) => ({
            id: `${r.id}-${h.pitch}-${h.yaw}`,
            label: h.text,
            targetRoom: h.targetRoomId || "",
            x: h.yaw, // map yaw to x
            y: h.pitch, // map pitch to y
          })),
        };
        return acc;
      }, {} as Record<string, RoomData>);
    }
    return {};
  }, [tourData]);

  const [activeRoom360, setActiveRoom360] = useState<string>("");
  const firstRoomKey = useMemo(() => {
    const keys = Object.keys(activeRooms360);
    return keys.length > 0 ? keys[0] : "";
  }, [activeRooms360]);

  const currentRoomKey = activeRoom360 || firstRoomKey;

  // Initialize Pannellum
  useEffect(() => {
    if (scriptStatus !== "ready" || !viewerContainerRef.current || !tourData || !tourData.enabled || !tourData.rooms || tourData.rooms.length === 0) return;

    interface WindowPannellum {
      pannellum?: {
        viewer: (container: HTMLElement | string, config: Record<string, unknown>) => {
          destroy: () => void;
          loadScene: (sceneId: string) => void;
          on: (event: string, handler: (sceneId: string) => void) => void;
        };
      };
    }
    const pannellum = (window as unknown as WindowPannellum).pannellum;
    if (!pannellum) return;

    // Destroy existing viewer
    if (viewerInstance.current) {
      try {
        viewerInstance.current.destroy();
      } catch (e) {
        console.error("Error destroying Pannellum viewer", e);
      }
      viewerInstance.current = null;
    }

    const scenes: Record<string, Record<string, unknown>> = {};
    tourData.rooms.forEach((room) => {
      scenes[room.id] = {
        title: room.name,
        type: "equirectangular",
        panorama: room.panorama,
        autoLoad: true,
        showZoomCtrl: false,
        showFullscreenCtrl: false,
        hotSpots: (room.hotspots || []).map((h) => {
          if (h.type === "scene") {
            return {
              pitch: h.pitch,
              yaw: h.yaw,
              type: "scene",
              text: h.text,
              sceneId: h.targetRoomId,
            };
          } else {
            return {
              pitch: h.pitch,
              yaw: h.yaw,
              type: "info",
              text: h.text,
            };
          }
        }),
      };
    });

    const firstScene = tourData.rooms[0].id;

    try {
      const viewer = pannellum.viewer(viewerContainerRef.current, {
        default: {
          firstScene,
          sceneFadeDuration: 700,
          autoLoad: true,
        },
        scenes,
      });

      viewerInstance.current = viewer;

      // Track active scene in Pannellum
      viewer.on("scenechange", (sceneId: string) => {
        setActiveRoom360(sceneId);
        toast.success(`Entered: ${scenes[sceneId]?.title || sceneId}`);
      });

    } catch (err) {
      console.error("Pannellum viewer initialization failed:", err);
    }

    return () => {
      if (viewerInstance.current) {
        try {
          viewerInstance.current.destroy();
        } catch {
          // ignore
        }
        viewerInstance.current = null;
      }
    };
  }, [scriptStatus, tourData]);

  // ==========================================
  // 2. 2D PHOTO ROOM TOUR IMPLEMENTATION
  // ==========================================
  const categories2d = useMemo(() => {
    const groups: Record<string, string[]> = {};

    if (imageDetails && imageDetails.length > 0) {
      imageDetails.forEach((img) => {
        const cat = img.category || "Other";
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(img.url);
      });
    } else if (images && images.length > 0) {
      images.forEach((url, idx) => {
        const cat = idx === 0 ? "Living Room" : "Other";
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(url);
      });
    }

    return groups;
  }, [imageDetails, images]);

  const categoryList2d = useMemo(() => Object.keys(categories2d), [categories2d]);

  const [activeCategory2d, setActiveCategory2d] = useState<string>("");
  const [activePhotoIdx, setActivePhotoIdx] = useState<number>(0);

  const currentCategory2d = activeCategory2d || (categoryList2d.length > 0 ? categoryList2d[0] : "");
  const activePhotos = useMemo(() => {
    return categories2d[currentCategory2d] || [];
  }, [categories2d, currentCategory2d]);

  const currentPhoto2d = activePhotos[activePhotoIdx] || activePhotos[0];

  const handleCategoryChange2d = (cat: string) => {
    setActiveCategory2d(cat);
    setActivePhotoIdx(0);
    setZoom(1);
  };

  const cyclePhoto = (direction: "next" | "prev") => {
    if (activePhotos.length <= 1) return;
    if (direction === "next") {
      setActivePhotoIdx((prev) => (prev + 1) % activePhotos.length);
    } else {
      setActivePhotoIdx((prev) => (prev - 1 + activePhotos.length) % activePhotos.length);
    }
  };

  // --- Render Functions ---

  if (mode === "empty") {
    return (
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-3xl bg-zinc-50 dark:bg-zinc-900/50 p-12 text-center shadow-inner">
        <ImageIcon className="h-10 w-10 text-zinc-400 mx-auto mb-3 animate-pulse" />
        <h4 className="text-zinc-900 dark:text-zinc-50 font-bold text-sm">No Property Tour Available</h4>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs mx-auto leading-relaxed">
          The host needs to upload property photos to create the tour.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={viewerRef}
      className={`border border-zinc-200 dark:border-zinc-800 rounded-3xl bg-zinc-950 overflow-hidden relative shadow-xl ${
        isFullscreen ? "w-screen h-screen rounded-none z-50 fixed inset-0" : "aspect-video w-full"
      }`}
    >
      {/* 1. 360 WebGL PANORAMA VIEWER */}
      {mode === "360" && (
        <div className="w-full h-full relative overflow-hidden flex items-center justify-center select-none">
          {scriptStatus === "loading" && (
            <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-zinc-300 font-bold uppercase tracking-widest">
                Stitching room panorama...
              </span>
            </div>
          )}
          
          {scriptStatus === "error" && (
            <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center text-center p-4">
              <span className="text-sm text-red-500 font-bold">Failed to load WebGL 3D panorama engine.</span>
            </div>
          )}

          {/* Pannellum DOM mount point */}
          <div ref={viewerContainerRef} className="w-full h-full" />

          {/* Ambient Overlay Title */}
          <div className="absolute top-4 left-4 bg-zinc-900/85 backdrop-blur px-3.5 py-2 rounded-2xl border border-zinc-700 text-xs font-semibold text-white pointer-events-none flex items-center gap-2 z-10">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span>Interactive 3D Tour: {activeRooms360[currentRoomKey]?.name || "Virtual Stay"}</span>
          </div>

          <div className="absolute bottom-4 left-4 bg-zinc-900/80 backdrop-blur px-3 py-1.5 rounded-xl text-[9px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1.5 pointer-events-none z-10">
            <Move className="w-3.5 h-3.5" />
            Drag or swipe to explore
          </div>
        </div>
      )}

      {/* 2. 2D PHOTO ROOM TOUR */}
      {mode === "2d" && currentPhoto2d && (
        <div className="w-full h-full relative flex items-center justify-center bg-zinc-950 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${currentCategory2d}-${activePhotoIdx}`}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              className="w-full h-full flex items-center justify-center pointer-events-none select-none"
              style={{
                transform: `scale(${zoom})`,
                transition: "transform 0.15s ease-out",
              }}
            >
              <img
                src={currentPhoto2d}
                alt={`${currentCategory2d} View`}
                className="max-h-full max-w-full object-contain"
              />
            </motion.div>
          </AnimatePresence>

          {/* Left/Right cycle buttons */}
          {activePhotos.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => cyclePhoto("prev")}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-zinc-900/70 hover:bg-zinc-900/90 text-white border border-zinc-700/50 shadow transition cursor-pointer z-40"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => cyclePhoto("next")}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-zinc-900/70 hover:bg-zinc-900/90 text-white border border-zinc-700/50 shadow transition cursor-pointer z-40"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Label indicating host photo trace */}
          <div className="absolute top-4 left-4 bg-zinc-900/85 backdrop-blur px-3 py-1.5 rounded-xl border border-zinc-750 text-[10px] font-semibold text-white pointer-events-none flex items-center gap-1.5 shadow z-10">
            <Camera className="w-3.5 h-3.5 text-zinc-400" />
            <span>Room Tour: {currentCategory2d} ({activePhotoIdx + 1} / {activePhotos.length})</span>
          </div>

          <div className="absolute bottom-4 left-4 bg-zinc-900/80 backdrop-blur px-3 py-1 rounded-lg text-[8px] text-zinc-400 font-bold uppercase tracking-wider pointer-events-none z-10">
            Tour created from the photos provided by the host.
          </div>
        </div>
      )}

      {/* CONTROL BAR (Right Side Widgets) */}
      <div className="absolute right-4 bottom-4 flex flex-col gap-2 z-40">
        <button
          onClick={() => handleZoom("in")}
          className="p-2 bg-zinc-900/85 hover:bg-zinc-800 border border-zinc-700 text-white rounded-xl shadow-lg transition cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleZoom("out")}
          className="p-2 bg-zinc-900/85 hover:bg-zinc-800 border border-zinc-700 text-white rounded-xl shadow-lg transition cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={toggleFullscreen}
          className="p-2 bg-zinc-900/85 hover:bg-zinc-800 border border-zinc-700 text-white rounded-xl shadow-lg transition cursor-pointer"
          title="Toggle Fullscreen"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* BOTTOM ROOM NAVIGATION TABS */}
      {mode === "360" && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-zinc-900/80 backdrop-blur px-2.5 py-1.5 rounded-2xl border border-zinc-700 z-40 flex items-center gap-1.5">
          {Object.entries(activeRooms360).map(([key, data]) => (
            <button
              key={key}
              onClick={() => {
                if (viewerInstance.current) {
                  viewerInstance.current.loadScene(key);
                } else {
                  setActiveRoom360(key);
                }
              }}
              className={`px-3 py-1 rounded-xl text-[9px] font-bold transition cursor-pointer ${
                currentRoomKey === key
                  ? "bg-rose-500 text-white shadow"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {data.name}
            </button>
          ))}
        </div>
      )}

      {mode === "2d" && categoryList2d.length > 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-zinc-900/80 backdrop-blur px-2.5 py-1.5 rounded-2xl border border-zinc-700 z-40 flex flex-col items-center gap-1.5">
          {/* Categories Tab list */}
          <div className="flex items-center gap-1.5">
            {categoryList2d.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryChange2d(cat)}
                className={`px-2.5 py-0.5 rounded-lg text-[9px] font-bold transition cursor-pointer ${
                  currentCategory2d === cat
                    ? "bg-rose-500 text-white shadow"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Sub-thumbnails (only if active category has multiple images) */}
          {activePhotos.length > 1 && (
            <div className="flex gap-1 pt-1 max-w-[200px] sm:max-w-md overflow-x-auto no-scrollbar">
              {activePhotos.map((url, idx) => (
                <button
                  key={idx}
                  onClick={() => setActivePhotoIdx(idx)}
                  className={`relative w-8 h-6 rounded-md overflow-hidden border transition cursor-pointer ${
                    activePhotoIdx === idx
                      ? "border-rose-500 scale-105"
                      : "border-zinc-700 opacity-60 hover:opacity-90"
                  }`}
                >
                  <img src={url} alt="Room preview" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
