import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MarketingLayout from "@/components/marketing/MarketingLayout";
import FeatureCard from "@/components/marketing/FeatureCard";
import GradientButton from "@/components/marketing/GradientButton";
import {
  Image,
  Layers,
  Maximize2,
  Settings,
  FileOutput,
  Scan,
  Factory,
  Users,
  Sparkles,
} from "lucide-react";

// Lock Aspect Ratio Card Component with functional toggle
const LockAspectRatioCard = () => {
  const [isLocked, setIsLocked] = useState(true);

  return (
    <div className="relative bg-white rounded-2xl shadow-xl border border-gray-200 p-8 hover:shadow-2xl transition-shadow">
      {/* Step Number Badge */}
      <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg">
        2
      </div>

      {/* Visual - Mini Image Handler */}
      <div className="mb-6 mt-4">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          {/* File Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg"></div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Your Design File.png</p>
              <p className="text-xs text-gray-500">PNG Image</p>
            </div>
          </div>

          {/* Dimensions */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1 font-medium">Width</p>
              <p className="text-xl font-bold text-gray-900">12.00 <span className="text-sm font-normal text-gray-600">inches</span></p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1 font-medium">Height</p>
              <p className="text-xl font-bold text-gray-900">18.00 <span className="text-sm font-normal text-gray-600">inches</span></p>
            </div>
          </div>

          {/* Original Size */}
          <p className="text-xs text-gray-500 mb-3">
            Original: <span className="font-mono">3600 × 5400 px</span>
          </p>

          {/* Lock Aspect Ratio - FULLY FUNCTIONAL TOGGLE */}
          <div className="flex items-center gap-2 mb-3">
            {/* Toggle Switch - Interactive with click handler */}
            <button
              onClick={() => setIsLocked(!isLocked)}
              className="relative inline-flex items-center cursor-pointer focus:outline-none group"
              aria-label="Toggle aspect ratio lock"
            >
              <div className={`w-11 h-6 rounded-full shadow-sm transition-all duration-200 ${
                isLocked
                  ? 'bg-indigo-500 group-hover:bg-indigo-600'
                  : 'bg-gray-300 group-hover:bg-gray-400'
              }`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200 ${
                  isLocked ? 'translate-x-5' : 'translate-x-0.5'
                }`}></div>
              </div>
            </button>
            <span className="text-sm text-gray-700 select-none">Lock Aspect Ratio</span>
          </div>

          {/* DPI Badge */}
          <div>
            <span className="inline-block px-3 py-1 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-xs font-bold rounded-full">
              300 DPI
            </span>
          </div>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-2xl font-bold text-gray-900 mb-3">
        Set the Dimensions
      </h3>

      {/* Description */}
      <p className="text-gray-600 leading-relaxed">
        Enter your required width and height — the aspect ratio stays perfectly maintained for accurate print sizing.
      </p>
    </div>
  );
};

const ProductNew = () => {
  const navigate = useNavigate();

  return (
    <MarketingLayout>
      {/* Main wrapper with gradient background */}
      <div
        style={{
          background: 'linear-gradient(135deg, #ecfdf5 0%, #ede9fe 50%, #fce7f3 100%)',
        }}
      >
        {/* Hero Section */}
        <section className="pt-12 md:pt-16 pb-8 md:pb-12">
          <div className="container max-w-7xl mx-auto px-6">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 text-gray-900 leading-tight">
                No Photoshop skills needed
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                Just follow 3 simple steps and your DTF print sheet is ready.
              </p>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-12">
          <div className="container mx-auto px-4">

            {/* 3 Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-7xl mx-auto">

              {/* CARD 1: Upload Your Files */}
              <div className="relative bg-white rounded-2xl shadow-xl border border-gray-200 p-8 hover:shadow-2xl transition-shadow">

                {/* Step Number Badge */}
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg">
                  1
                </div>

                {/* Visual - Upload Zone */}
                <div className="mb-6 mt-4">
                  <div className="relative bg-gray-50 border-2 border-dashed border-indigo-400 rounded-xl p-8 h-64 flex flex-col items-center">

                    {/* Content positioned at TOP - PULLED UP */}
                    <div className="flex flex-col items-center pt-2">
                      {/* Upload Icon */}
                      <div className="mb-3">
                        <svg className="w-14 h-14 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <p className="text-indigo-600 font-bold text-base mb-1.5">DROP FILES HERE</p>
                      <p className="text-gray-700 text-sm font-semibold">or click to browse</p>
                    </div>

                    {/* Floating Image Thumbnails - KEEP SAME POSITION */}
                    <div className="absolute bottom-4 left-4 right-4 flex gap-2 justify-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg shadow-md transform -rotate-6"></div>
                      <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg shadow-md transform rotate-3"></div>
                      <div className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-violet-500 rounded-lg shadow-md transform -rotate-3"></div>
                    </div>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Upload Your Files
                </h3>

                {/* Description */}
                <p className="text-gray-600 leading-relaxed">
                  Simply drag and drop your PNG artwork — instant previews make it effortless to get started.
                </p>
              </div>

              {/* CARD 2: Set the Dimensions */}
              <LockAspectRatioCard />

              {/* CARD 3: Generate Sheet */}
              <div className="relative bg-white rounded-2xl shadow-xl border border-gray-200 p-8 hover:shadow-2xl transition-shadow">

                {/* Step Number Badge */}
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg">
                  3
                </div>

                {/* Visual - Mini Collage Preview */}
                <div className="mb-6 mt-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">

                    {/* Mini Grid Layout */}
                    <div className="grid grid-cols-3 gap-2 mb-4 h-40">
                      <div className="bg-gradient-to-br from-indigo-100 to-violet-200 rounded-lg"></div>
                      <div className="bg-gradient-to-br from-indigo-100 to-violet-200 rounded-lg col-span-2"></div>
                      <div className="bg-gradient-to-br from-indigo-100 to-violet-200 rounded-lg col-span-2"></div>
                      <div className="bg-gradient-to-br from-indigo-100 to-violet-200 rounded-lg"></div>
                      <div className="bg-gradient-to-br from-indigo-100 to-violet-200 rounded-lg col-span-3"></div>
                    </div>

                    {/* Generate Button */}
                    <button className="w-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>Generate Sheet</span>
                    </button>

                  </div>
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Generate Sheet
                </h3>

                {/* Description */}
                <p className="text-gray-600 leading-relaxed">
                  With one click, your images are arranged into a clean, print-ready sheet ready to download.
                </p>
              </div>

            </div>

          </div>
        </section>

      {/* CTA Section with Gradient and Pattern */}
      <section
        className="relative bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 py-24 mt-12"
        style={{
          backgroundImage: `
            radial-gradient(circle, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(to bottom right, #818CF8, #6366F1, #2563eb)
          `,
          backgroundSize: '24px 24px, 100% 100%',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-black/10 to-transparent" />

        <div className="relative container max-w-7xl mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center text-white">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              Ready to Transform Your Workflow?
            </h2>
            <p className="text-xl md:text-2xl mb-10 text-white/95 leading-relaxed">
              Join hundreds of print professionals who save hours every week with our smart collage creator
            </p>
            <GradientButton
              variant="white"
              size="xl"
              onClick={() => navigate("/auth")}
              className="group"
            >
              <span>Get Started Now</span>
              <svg
                className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </GradientButton>
          </div>
        </div>
      </section>

      {/* Features Section - Alternating Layout */}

      {/* Section 1: Easy Upload - Text LEFT, Image RIGHT */}
      <section className="pt-20 lg:pt-28 pb-12 lg:pb-16">
        <div className="container max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Text Column */}
            <div>
              <div className="inline-block px-4 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium mb-4">
                Simple & Fast
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                Upload Your Images in Seconds
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                Drag and drop your images or upload in bulk. Supports all major image formats with instant processing. No technical knowledge required.
              </p>
            </div>

            {/* Image Column */}
            <div>
              <div className="relative">
                {/* Floating animated card */}
                <div className="animate-float">
                  <div className="relative max-w-md mx-auto">
                    {/* Card container with border beams */}
                    <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 overflow-hidden">

                        {/* First animated border beam - EMERALD GREEN with transparency */}
                        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                          <div
                            className="absolute -inset-[100px] animate-border-beam"
                            style={{
                              background: 'conic-gradient(from 0deg, transparent 0deg, transparent 200deg, rgba(16, 185, 129, 0) 230deg, rgba(16, 185, 129, 0.9) 260deg, rgba(52, 211, 153, 1) 280deg, rgba(16, 185, 129, 0.9) 300deg, rgba(16, 185, 129, 0) 330deg, transparent 360deg)',
                              filter: 'blur(2px)',
                            }}
                          />
                        </div>

                        {/* Second animated border beam - BLUE with transparency (delayed) */}
                        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                          <div
                            className="absolute -inset-[100px] animate-border-beam-delayed"
                            style={{
                              background: 'conic-gradient(from 0deg, transparent 0deg, transparent 200deg, rgba(59, 130, 246, 0) 230deg, rgba(59, 130, 246, 0.9) 260deg, rgba(37, 99, 235, 1) 280deg, rgba(59, 130, 246, 0.9) 300deg, rgba(59, 130, 246, 0) 330deg, transparent 360deg)',
                              filter: 'blur(2px)',
                            }}
                          />
                        </div>

                        {/* White card background mask */}
                        <div className="absolute inset-[2px] bg-white rounded-2xl z-0"></div>

                        {/* Card content */}
                        <div className="relative z-10 p-6">
                      {/* Header with thumbnail and filename */}
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-purple-400 to-pink-500 flex-shrink-0 shadow-lg"></div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
                            Your Design File.png
                          </h3>
                        </div>
                      </div>

                      {/* Dimensions Grid */}
                      <div className="grid grid-cols-2 gap-6 mb-4">
                        <div>
                          <div className="text-xs text-gray-500 uppercase font-medium mb-1">WIDTH</div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-gray-900">12.00</span>
                            <span className="text-sm text-gray-600">inches</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 uppercase font-medium mb-1">HEIGHT</div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-gray-900">18.00</span>
                            <span className="text-sm text-gray-600">inches</span>
                          </div>
                        </div>
                      </div>

                      {/* Original dimensions */}
                      <div className="text-sm text-gray-500 mb-3">
                        Original: <span className="font-mono">3600 × 5400 px</span>
                      </div>

                      {/* Toggle switch for aspect ratio */}
                      <label className="flex items-center gap-2 cursor-pointer mb-4">
                        <div className="relative">
                          <input type="checkbox" className="sr-only peer" defaultChecked />
                          <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                        </div>
                        <span className="text-sm text-gray-700">Lock Aspect Ratio</span>
                      </label>

                      {/* DPI Badge */}
                      <div className="mb-6">
                        <span className="inline-block px-4 py-1.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-bold rounded-full shadow-md">
                          300 DPI
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3">
                        <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Duplicate
                        </button>
                        <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

      {/* Divider */}
      <div className="max-w-4xl mx-auto px-6">
        <hr className="border-gray-200" />
      </div>

      {/* Section 2: Smart Layouts - Image LEFT, Text RIGHT */}
      <section className="py-12 lg:py-16">
        <div className="container max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Text Column */}
            <div className="lg:order-2">
              <div className="inline-block px-4 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium mb-4">
                AI-Powered
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                Intelligent Auto-Arrangement
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                Our smart algorithm automatically arranges images efficiently, maximizing space usage and minimizing waste. Save time and material costs.
              </p>
            </div>

            {/* Image Column */}
            <div className="lg:order-1">
              <div className="relative">
                {/* Before/After Container */}
                <div className="animate-float">
                <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 p-8 max-w-xl mx-auto overflow-hidden">

                  {/* Border beams */}
                  <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                    <div
                      className="absolute -inset-[100px] animate-border-beam"
                      style={{
                        background: 'conic-gradient(from 0deg, transparent 0deg, transparent 200deg, rgba(20, 184, 166, 0) 230deg, rgba(20, 184, 166, 0.9) 260deg, rgba(6, 182, 212, 1) 280deg, rgba(20, 184, 166, 0.9) 300deg, rgba(20, 184, 166, 0) 330deg, transparent 360deg)',
                        filter: 'blur(2px)',
                      }}
                    />
                  </div>

                  <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                    <div
                      className="absolute -inset-[100px] animate-border-beam-delayed"
                      style={{
                        background: 'conic-gradient(from 0deg, transparent 0deg, transparent 200deg, rgba(59, 130, 246, 0) 230deg, rgba(59, 130, 246, 0.9) 260deg, rgba(139, 92, 246, 1) 280deg, rgba(59, 130, 246, 0.9) 300deg, rgba(59, 130, 246, 0) 330deg, transparent 360deg)',
                        filter: 'blur(2px)',
                      }}
                    />
                  </div>

                  {/* White background mask */}
                  <div className="absolute inset-[2px] bg-white rounded-2xl z-0"></div>

                  {/* Content */}
                  <div className="relative z-10">
                    {/* Before/After Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">

                      {/* BEFORE - Messy Layout */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-sm font-semibold text-red-600 bg-red-100 px-3 py-1.5 rounded-full">
                            Before
                          </span>
                          <span className="text-sm text-gray-600 font-medium">Wasted Space</span>
                        </div>

                        {/* Messy grid with gaps */}
                        <div className="relative h-80 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-4">
                          {/* Random scattered boxes */}
                          <div className="absolute top-6 left-6 w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg shadow-md transform rotate-12"></div>
                          <div className="absolute top-20 right-10 w-16 h-24 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg shadow-md transform -rotate-6"></div>
                          <div className="absolute bottom-16 left-14 w-24 h-16 bg-gradient-to-br from-indigo-400 to-violet-500 rounded-lg shadow-md transform rotate-3"></div>
                          <div className="absolute top-36 left-10 w-16 h-16 bg-gradient-to-br from-indigo-400 to-indigo-500 rounded-lg shadow-md transform -rotate-12"></div>
                          <div className="absolute bottom-6 right-6 w-20 h-20 bg-gradient-to-br from-pink-400 to-purple-500 rounded-lg shadow-md transform rotate-6"></div>

                          {/* Empty space indicator - bottom center with white background */}
                          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-md z-10">
                            <div className="text-2xl mb-1">😰</div>
                            <p className="text-sm text-red-600 font-semibold">40% Wasted</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-gray-600 pt-2">
                          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <span>Inefficient spacing</span>
                        </div>
                      </div>

                      {/* Arrow between */}
                      <div className="hidden md:block absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                        <div className="bg-white rounded-full p-3 shadow-xl border-2 border-indigo-200">
                          <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </div>
                      </div>

                      {/* AFTER - Optimized Layout */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-sm font-semibold text-indigo-600 bg-indigo-100 px-3 py-1.5 rounded-full">
                            After
                          </span>
                          <span className="text-sm text-gray-600 font-medium">Optimized</span>
                        </div>

                        {/* Organized grid - perfectly packed */}
                        <div className="relative h-80 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl border-2 border-indigo-300 p-4">
                          {/* Perfectly arranged boxes */}
                          <div className="grid grid-cols-3 gap-2 h-full">
                            <div className="bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg shadow-md"></div>
                            <div className="bg-gradient-to-br from-orange-400 to-red-500 rounded-lg shadow-md col-span-2"></div>
                            <div className="bg-gradient-to-br from-indigo-400 to-violet-500 rounded-lg shadow-md col-span-2"></div>
                            <div className="bg-gradient-to-br from-indigo-400 to-indigo-500 rounded-lg shadow-md"></div>
                            <div className="bg-gradient-to-br from-pink-400 to-purple-500 rounded-lg shadow-md col-span-3"></div>
                          </div>

                          {/* Checkmark overlay */}
                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-lg">
                            <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-gray-600 pt-2">
                          <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>~95% space utilization</span>
                        </div>
                      </div>

                    </div>

                    {/* Stats Bar */}
                    <div className="mt-8 pt-6 border-t border-gray-200">
                      <div className="grid grid-cols-3 gap-6 text-center">
                        <div>
                          <div className="text-2xl font-bold text-indigo-600">~95%</div>
                          <div className="text-sm text-gray-600 mt-2 font-medium">Space Used</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-blue-600">3 sec</div>
                          <div className="text-sm text-gray-600 mt-2 font-medium">Processing Time</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-purple-600">Rs. 1000</div>
                          <div className="text-sm text-gray-600 mt-2 font-medium">Saved</div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
                </div>

                {/* Decorative element */}
                <div className="absolute -z-10 -top-10 -left-10 w-72 h-72 bg-gradient-to-br from-indigo-200 to-violet-200 rounded-full blur-3xl opacity-30"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-4xl mx-auto px-6">
        <hr className="border-gray-200" />
      </div>

      {/* Section 3: Speed Comparison - Text LEFT, Visual RIGHT */}
      <section className="py-12 lg:py-16">
        <div className="container max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Text Column */}
            <div>
              <div className="inline-block px-4 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium mb-4">
                Lightning Fast
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                150x Faster Than Manual Arrangement
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed mb-6">
                What takes hours manually takes just seconds with DTF Collage Creator. Eliminate tedious manual work and focus on growing your business.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700">Save 2.75 hours per batch</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700">Zero errors, perfect every time</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700">Fully automated workflow</span>
                </div>
              </div>
            </div>

            {/* Speed Comparison Card */}
            <div className="relative">
              <div className="animate-float">
              <div className="relative max-w-6xl mx-auto">
                <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 px-10 py-8">

                  {/* Border beams */}
                  <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                    <div
                      className="absolute -inset-[100px] animate-border-beam"
                      style={{
                        background: 'conic-gradient(from 0deg, transparent 0deg, transparent 200deg, rgba(20, 184, 166, 0) 230deg, rgba(20, 184, 166, 0.9) 260deg, rgba(6, 182, 212, 1) 280deg, rgba(20, 184, 166, 0.9) 300deg, rgba(20, 184, 166, 0) 330deg, transparent 360deg)',
                        filter: 'blur(2px)',
                      }}
                    />
                  </div>

                  <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                    <div
                      className="absolute -inset-[100px] animate-border-beam-delayed"
                      style={{
                        background: 'conic-gradient(from 0deg, transparent 0deg, transparent 200deg, rgba(139, 92, 246, 0) 230deg, rgba(139, 92, 246, 0.9) 260deg, rgba(236, 72, 153, 1) 280deg, rgba(139, 92, 246, 0.9) 300deg, rgba(139, 92, 246, 0) 330deg, transparent 360deg)',
                        filter: 'blur(2px)',
                      }}
                    />
                  </div>

                  {/* White background mask */}
                  <div className="absolute inset-[2px] bg-white rounded-2xl z-0"></div>

                  {/* Content */}
                  <div className="relative z-10">

                    {/* Side-by-side Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-8 relative">

                      {/* LEFT: Manual Method */}
                      <div className="p-6 bg-red-50 rounded-xl border-2 border-red-200">

                        {/* Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">😰</span>
                            <h3 className="text-xl font-bold text-red-700">Manual Method</h3>
                          </div>
                        </div>
                        <div className="mb-3">
                          <span className="text-sm font-semibold text-red-600 bg-red-100 px-3 py-1.5 rounded-full">
                            Traditional Way
                          </span>
                        </div>

                        {/* Timer */}
                        <div className="mb-3 p-4 bg-white rounded-lg border border-red-300">
                          <div className="flex items-center justify-center gap-2 mb-1.5">
                            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-3xl font-mono font-bold text-red-600 tabular-nums">
                              02:45:00
                            </span>
                          </div>
                          <p className="text-sm text-center text-red-600 font-medium">Average time per batch</p>
                        </div>

                        {/* Pain Points */}
                        <div className="space-y-2 mb-3">
                          <div className="flex items-center gap-3 text-sm text-red-700">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span>Error-prone manual arrangement</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-red-700">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span>Tedious & exhausting process</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-red-700">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span>Wasted time & money</span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm text-red-600 font-medium">
                            <span>Progress</span>
                            <span>20%</span>
                          </div>
                          <div className="h-2.5 bg-red-200 rounded-full overflow-hidden">
                            <div className="h-full w-[20%] bg-red-500 rounded-full animate-pulse"></div>
                          </div>
                        </div>
                      </div>

                      {/* RIGHT: DTF LAYOUT */}
                      <div className="p-6 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl border-2 border-indigo-300">

                        {/* Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">✨</span>
                            <h3 className="text-xl font-bold text-indigo-700">DTF LAYOUT</h3>
                          </div>
                        </div>
                        <div className="mb-3">
                          <span className="text-sm font-semibold text-indigo-600 bg-indigo-100 px-3 py-1.5 rounded-full">
                            Automated
                          </span>
                        </div>

                        {/* Timer */}
                        <div className="mb-3 p-4 bg-white rounded-lg border border-indigo-300">
                          <div className="flex items-center justify-center gap-2 mb-1.5">
                            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span className="text-3xl font-mono font-bold text-indigo-600 tabular-nums animate-pulse">
                              00:00:15
                            </span>
                          </div>
                          <p className="text-sm text-center text-indigo-600 font-medium">Lightning fast processing</p>
                        </div>

                        {/* Benefits */}
                        <div className="space-y-2 mb-3">
                          <div className="flex items-center gap-3 text-sm text-indigo-700">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Perfect arrangement every time</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-indigo-700">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Fully automated process</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-indigo-700">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Set it and forget it</span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm text-indigo-600 font-medium">
                            <span>Progress</span>
                            <span className="animate-pulse">100%</span>
                          </div>
                          <div className="h-2.5 bg-indigo-200 rounded-full overflow-hidden">
                            <div className="h-full w-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full animate-progress-bar"></div>
                          </div>
                        </div>
                      </div>

                      {/* VS Badge - centered between panels */}
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 hidden lg:block">
                        <div className="bg-white px-5 py-2.5 rounded-full border-2 border-gray-300 shadow-xl">
                          <div className="flex items-center gap-2">
                            <span className="text-xl animate-bounce">⚡</span>
                            <span className="text-base font-bold text-gray-700">VS</span>
                            <span className="text-xl animate-bounce" style={{ animationDelay: '0.2s' }}>⚡</span>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Stats Footer */}
                    <div className="pt-6 border-t-2 border-gray-200">
                      <div className="grid grid-cols-3 gap-10 text-center">
                        <div>
                          <div className="text-3xl font-bold text-indigo-600 mb-1.5">2.75 hrs</div>
                          <div className="text-base text-gray-600 font-medium">Time Saved</div>
                        </div>
                        <div>
                          <div className="text-3xl font-bold text-blue-600 mb-1.5">150x</div>
                          <div className="text-base text-gray-600 font-medium">Faster</div>
                        </div>
                        <div>
                          <div className="text-3xl font-bold text-purple-600 mb-1.5">100%</div>
                          <div className="text-base text-gray-600 font-medium">Accurate</div>
                        </div>
                      </div>
                    </div>

                  </div>

                </div>

                {/* Decorative blur */}
                <div className="absolute -z-10 -bottom-10 -right-10 w-80 h-80 bg-gradient-to-br from-purple-200 to-pink-200 rounded-full blur-3xl opacity-30"></div>
              </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-4xl mx-auto px-6">
        <hr className="border-gray-200" />
      </div>

      {/* Section 4: Export Ready - Image LEFT, Text RIGHT */}
      <section className="py-12 lg:py-16">
        <div className="container max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Text Column */}
            <div className="lg:order-2">
              <div className="inline-block px-4 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium mb-4">
                Print Perfect
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                Download Print-Ready Files
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                Get precise measurements, cutting guides, and custom DPI. Files are optimized for DTF printing with professional quality guaranteed.
              </p>
            </div>

            {/* Image Column */}
            <div className="lg:order-1">
              <div className="relative max-w-xl">
                {/* Floating animation wrapper */}
                <div className="animate-float">

                  {/* Main export card - INCREASED PADDING */}
                  <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 p-14">

                    {/* Border beams */}
                    <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                      <div
                        className="absolute -inset-[100px] animate-border-beam"
                        style={{
                          background: 'conic-gradient(from 0deg, transparent 0deg, transparent 200deg, rgba(139, 92, 246, 0) 230deg, rgba(139, 92, 246, 0.9) 260deg, rgba(236, 72, 153, 1) 280deg, rgba(139, 92, 246, 0.9) 300deg, rgba(139, 92, 246, 0) 330deg, transparent 360deg)',
                          filter: 'blur(2px)',
                        }}
                      />
                    </div>

                    <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                      <div
                        className="absolute -inset-[100px] animate-border-beam-delayed"
                        style={{
                          background: 'conic-gradient(from 0deg, transparent 0deg, transparent 200deg, rgba(6, 182, 212, 0) 230deg, rgba(6, 182, 212, 0.9) 260deg, rgba(16, 185, 129, 1) 280deg, rgba(6, 182, 212, 0.9) 300deg, rgba(6, 182, 212, 0) 330deg, transparent 360deg)',
                          filter: 'blur(2px)',
                        }}
                      />
                    </div>

                    {/* White background mask */}
                    <div className="absolute inset-[2px] bg-white rounded-2xl z-0"></div>

                    {/* Content */}
                    <div className="relative z-10">
                      {/* Ready to Print Badge - Top Right */}
                      <div className="absolute -top-3 -right-3 z-20">
                        <div className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-sm font-bold">Ready to Print</span>
                        </div>
                      </div>

                      {/* File Preview Area - REDUCED HEIGHT */}
                      <div className="mb-4">
                        <div className="relative bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 p-3 h-48 flex items-center justify-center overflow-hidden">

                          {/* File preview - collage layout visualization */}
                          <div className="grid grid-cols-3 gap-2 w-full h-full p-3">
                            <div className="bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg shadow-md"></div>
                            <div className="bg-gradient-to-br from-orange-400 to-red-500 rounded-lg shadow-md col-span-2"></div>
                            <div className="bg-gradient-to-br from-indigo-400 to-violet-500 rounded-lg shadow-md col-span-2"></div>
                            <div className="bg-gradient-to-br from-indigo-400 to-indigo-500 rounded-lg shadow-md"></div>
                            <div className="bg-gradient-to-br from-pink-400 to-purple-500 rounded-lg shadow-md col-span-3"></div>
                          </div>

                          {/* Animated Checkmark Overlay */}
                          <div className="absolute inset-0 bg-indigo-500/10 backdrop-blur-[2px] flex items-center justify-center">
                            <div className="bg-white rounded-full p-4 shadow-2xl animate-bounce">
                              <svg className="w-16 h-16 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* File Info Section - REDUCED MARGINS */}
                      <div className="mb-4">
                        {/* Filename */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
                            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-gray-900 truncate">
                              DTF_Collage_Layout_Final.png
                            </h3>
                            <p className="text-sm text-gray-500">PNG Image</p>
                          </div>
                        </div>

                        {/* File Specifications Grid - REDUCED PADDING & MARGINS */}
                        <div className="grid grid-cols-2 gap-3 mb-3">

                          {/* Dimensions - UPDATED VALUES */}
                          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <div className="text-xs text-gray-500 uppercase font-medium mb-1">Dimensions</div>
                            <div className="text-lg font-bold text-gray-900">23" × 150"</div>
                            <div className="text-xs text-gray-600 font-mono mt-1">6900 × 45000 px</div>
                          </div>

                          {/* DPI - UPDATED TO SHOW BOTH */}
                          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <div className="text-xs text-gray-500 uppercase font-medium mb-1">Resolution</div>
                            <div className="text-lg font-bold text-gray-900">150 DPI / 300 DPI</div>
                            <div className="text-xs text-gray-600 mt-1">Print Quality</div>
                          </div>

                          {/* File Size */}
                          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <div className="text-xs text-gray-500 uppercase font-medium mb-1">File Size</div>
                            <div className="text-lg font-bold text-gray-900">35.4 MB</div>
                            <div className="text-xs text-gray-600 mt-1">Optimized</div>
                          </div>

                          {/* Format */}
                          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <div className="text-xs text-gray-500 uppercase font-medium mb-1">Format</div>
                            <div className="text-lg font-bold text-gray-900">PNG</div>
                            <div className="text-xs text-gray-600 mt-1">High Quality</div>
                          </div>

                        </div>

                        {/* Features List - REVERTED to original spacing */}
                        <div className="space-y-1.5 mb-3">
                          <div className="flex items-center gap-2 text-sm text-indigo-700">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Precise measurements & cutting guides</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-indigo-700">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Optimized for DTF printing</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-indigo-700">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Professional quality guaranteed</span>
                          </div>
                        </div>
                      </div>

                      {/* Download Button - REDUCED PADDING */}
                      <button className="w-full bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-[1.02] flex items-center justify-center gap-3">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span className="text-lg">Download Print-Ready File</span>
                      </button>
                    </div>

                  </div>
                </div>

                {/* Decorative blur */}
                <div className="absolute -z-10 -top-10 -left-10 w-72 h-72 bg-gradient-to-br from-purple-200 to-pink-200 rounded-full blur-3xl opacity-30"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className="py-24">
        <div className="container max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-block mb-4">
              <span className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-sm font-semibold">
                Core Features
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
              Everything You Need
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Powerful tools in one seamless platform
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Image className="w-8 h-8 text-indigo-600" />}
              title="Auto DTF Sheet Builder"
              description="Upload your images, set your sheet dimensions, and get an auto-generated print-optimized DTF sheet with preserved aspect ratios and perfect scaling."
            />
            <FeatureCard
              icon={<Layers className="w-8 h-8 text-indigo-600" />}
              title="Next-Gen Auto Layouts"
              description="No more hours arranging images — our app auto-builds and balances DTF collage layouts in seconds."
            />
            <FeatureCard
              icon={<Maximize2 className="w-8 h-8 text-indigo-600" />}
              title="Custom Canvas Sizes"
              description="Supports two standard DTF sheet widths: 11 inch and 23 inch, optimized for automatic layout and print-ready output."
            />
            <FeatureCard
              icon={<Settings className="w-8 h-8 text-indigo-600" />}
              title="Advanced Controls"
              description="Intelligent system automatically handles spacing, rotation, alignment and layout optimization for perfect DTF sheet structure."
            />
            <FeatureCard
              icon={<FileOutput className="w-8 h-8 text-indigo-600" />}
              title="Export Options"
              description="Export your DTF sheets in PNG with 150 DPI or 300 DPI output, optimized for print quality and accurate sizing."
            />
            <FeatureCard
              icon={<Scan className="w-8 h-8 text-indigo-600" />}
              title="Perfect Aspect Ratio"
              description="Maintains original image aspect ratio while scaling and arranging DTF print sheets for accurate size and placement."
            />
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-24">
        <div className="container max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-block mb-4">
              <span className="px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-sm font-semibold">
                Use Cases
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
              Built for Print Professionals
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Trusted by businesses of all sizes, from startups to enterprises
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Sparkles className="w-8 h-8 text-indigo-600" />}
              title="Small Businesses"
              description="Get started quickly with easy-to-use tools and affordable pricing. Perfect for solo entrepreneurs and small teams."
            />
            <FeatureCard
              icon={<Users className="w-8 h-8 text-indigo-600" />}
              title="Print Shops"
              description="Handle high-volume orders efficiently with batch processing, templates, and team collaboration features."
            />
            <FeatureCard
              icon={<Factory className="w-8 h-8 text-indigo-600" />}
              title="Production Facilities"
              description="Scale operations with enterprise-grade DTF sheet outputs, higher processing bandwidth, and dedicated support for business needs."
            />
          </div>
        </div>
      </section>

      {/* Advanced Features */}
      <section className="py-24">
        <div className="container max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-block mb-4">
              <span className="px-4 py-2 bg-purple-50 text-purple-600 rounded-full text-sm font-semibold">
                Advanced
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
              Pro-Level Capabilities
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Take your workflow to the next level
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="group bg-white rounded-2xl p-10 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:scale-105 transform">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Smart Templates
              </h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                Save your frequently used layouts as templates. Apply them to new projects with one click and maintain consistency across all orders.
              </p>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <span className="text-indigo-600 mr-3 text-lg">✓</span>
                  Save unlimited templates
                </li>
                <li className="flex items-start">
                  <span className="text-indigo-600 mr-3 text-lg">✓</span>
                  Share with team members
                </li>
                <li className="flex items-start">
                  <span className="text-indigo-600 mr-3 text-lg">✓</span>
                  Version control included
                </li>
              </ul>
            </div>

            <div className="group bg-white rounded-2xl p-10 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:scale-105 transform">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Batch Processing
              </h3>
              <p className="text-gray-600 leading-relaxed mb-6">
                Process multiple collages simultaneously. Perfect for high-volume operations that need to maintain speed without sacrificing quality.
              </p>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <span className="text-indigo-600 mr-3 text-lg">✓</span>
                  Queue unlimited jobs
                </li>
                <li className="flex items-start">
                  <span className="text-indigo-600 mr-3 text-lg">✓</span>
                  Background processing
                </li>
                <li className="flex items-start">
                  <span className="text-indigo-600 mr-3 text-lg">✓</span>
                  Priority queue support
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      </div>
    </MarketingLayout>
  );
};

export default ProductNew;
