'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Camera, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  RotateCcw, 
  Plus, 
  Search, 
  RefreshCw, 
  Sparkles,
  ChevronRight,
  UtensilsCrossed,
  Filter,
  Layers,
  ArrowRight,
  X,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { getSupabase, checkSupabaseConfig } from '@/lib/supabaseClient';
import { Dish, DishStage, STAGE_CONFIG } from '@/types/dish';

type TestStateOverride = 'none' | 'missing_setting' | 'supabase_error' | 'empty_table';

export default function MenuPhotoBoardPage() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [missingSettingsList, setMissingSettingsList] = useState<string[]>([]);
  
  // Filtering & search
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStage, setSelectedStage] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Add dish dialog state
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [newDishName, setNewDishName] = useState<string>('');
  const [newDishCategory, setNewDishCategory] = useState<string>('Brunch & Mains');
  const [newDishPrice, setNewDishPrice] = useState<string>('280');
  const [addError, setAddError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // State testing toggle (allows testing the 3 required failure states without second server)
  const [testOverride, setTestOverride] = useState<TestStateOverride>('none');
  const [lastActionDishId, setLastActionDishId] = useState<string | null>(null);

  // Check URL query params on mount for ?test=...
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const testParam = params.get('test') as TestStateOverride | null;
      if (testParam && ['missing_setting', 'supabase_error', 'empty_table'].includes(testParam)) {
        setTestOverride(testParam);
      }
    }
  }, []);

  // Fetch dishes from Supabase
  const loadDishes = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Check configuration
    const config = checkSupabaseConfig();
    if (!config.isConfigured || testOverride === 'missing_setting') {
      const missing = testOverride === 'missing_setting' 
        ? ['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_URL']
        : config.missingSettings;
      setMissingSettingsList(missing);
      setLoading(false);
      return;
    }

    if (testOverride === 'supabase_error') {
      setError('Connection refused: Supabase query rejected with code 401 (Simulated Supabase API failure)');
      setLoading(false);
      return;
    }

    if (testOverride === 'empty_table') {
      setDishes([]);
      setLoading(false);
      return;
    }

    try {
      const supabase = getSupabase();
      if (!supabase) {
        setMissingSettingsList(['NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']);
        setLoading(false);
        return;
      }

      const { data, error: sbError } = await supabase
        .from('dishes')
        .select('*')
        .order('created_at', { ascending: false });

      if (sbError) {
        throw new Error(sbError.message);
      }

      setDishes(data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error communicating with Supabase';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [testOverride]);

  useEffect(() => {
    loadDishes();
  }, [loadDishes]);

  // Stage advancement handler with optimistic update
  const advanceStage = async (dish: Dish) => {
    const config = STAGE_CONFIG[dish.stage];
    const nextStage = config.nextStage;
    if (!nextStage) return; // Already live

    const previousDishes = [...dishes];
    // Optimistic update
    setDishes(prev => prev.map(d => d.id === dish.id ? { ...d, stage: nextStage } : d));
    setLastActionDishId(dish.id);

    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Supabase client not initialized');

      const { error: updateError } = await supabase
        .from('dishes')
        .update({ stage: nextStage, updated_at: new Date().toISOString() })
        .eq('id', dish.id);

      if (updateError) {
        throw updateError;
      }
    } catch (err) {
      console.error('Failed to advance dish stage:', err);
      // Revert optimistic update
      setDishes(previousDishes);
      alert('Could not update stage in Supabase. Reverting changes.');
    }
  };

  // Revert stage handler (Undo) with optimistic update
  const revertStage = async (e: React.MouseEvent, dish: Dish) => {
    e.stopPropagation(); // Don't trigger advance
    const config = STAGE_CONFIG[dish.stage];
    const prevStage = config.prevStage;
    if (!prevStage) return; // Already at no_photo

    const previousDishes = [...dishes];
    // Optimistic update
    setDishes(prev => prev.map(d => d.id === dish.id ? { ...d, stage: prevStage } : d));
    setLastActionDishId(dish.id);

    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Supabase client not initialized');

      const { error: updateError } = await supabase
        .from('dishes')
        .update({ stage: prevStage, updated_at: new Date().toISOString() })
        .eq('id', dish.id);

      if (updateError) {
        throw updateError;
      }
    } catch (err) {
      console.error('Failed to revert dish stage:', err);
      setDishes(previousDishes);
      alert('Could not revert stage in Supabase. Rolling back.');
    }
  };

  // Add new dish
  const handleAddDish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDishName.trim()) {
      setAddError('Dish name cannot be empty');
      return;
    }

    setSubmitting(true);
    setAddError(null);

    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Supabase is not configured');

      const newDish = {
        name: newDishName.trim(),
        category: newDishCategory,
        stage: 'no_photo' as DishStage,
        price: parseFloat(newDishPrice) || 0,
        description: 'Fresh cafe addition',
      };

      const { data, error: insertError } = await supabase
        .from('dishes')
        .insert([newDish])
        .select()
        .single();

      if (insertError) throw insertError;

      if (data) {
        setDishes(prev => [data, ...prev]);
      }

      setNewDishName('');
      setIsAddOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add dish';
      setAddError(message);
    } finally {
      setSubmitting(false);
    }
  };

  // Reset demo data in empty state
  const handleSeedDemoData = async () => {
    setLoading(true);
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Supabase client not available');

      const demo = [
        { name: 'Avocado Sourdough Toast', category: 'Brunch & Mains', stage: 'no_photo', price: 380 },
        { name: 'Truffle Mushroom Omelette', category: 'Brunch & Mains', stage: 'no_photo', price: 350 },
        { name: 'Caramel Macchiato', category: 'Beverages', stage: 'no_photo', price: 260 },
        { name: 'Iced Spanish Latte', category: 'Beverages', stage: 'photo_taken', price: 280 },
        { name: 'Almond Butter Croissant', category: 'Bakery', stage: 'photo_taken', price: 220 },
        { name: 'Classic Cold Brew', category: 'Beverages', stage: 'photo_edited', price: 240 },
        { name: 'Belgian Dark Chocolate Waffle', category: 'Desserts', stage: 'photo_edited', price: 320 },
        { name: 'Paneer Tikka Brioche Roll', category: 'Brunch & Mains', stage: 'live', price: 310 },
        { name: 'Matcha Green Tea Latte', category: 'Beverages', stage: 'live', price: 290 },
      ];

      const { data, error: seedError } = await supabase
        .from('dishes')
        .insert(demo)
        .select();

      if (seedError) throw seedError;
      setDishes(data || []);
      setTestOverride('none');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Seed failed';
      alert('Error seeding demo data: ' + message);
    } finally {
      setLoading(false);
    }
  };

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = dishes.length;
    const noPhoto = dishes.filter(d => d.stage === 'no_photo').length;
    const photoTaken = dishes.filter(d => d.stage === 'photo_taken').length;
    const photoEdited = dishes.filter(d => d.stage === 'photo_edited').length;
    const live = dishes.filter(d => d.stage === 'live').length;
    const withProperPhoto = total - noPhoto;
    const percentComplete = total > 0 ? Math.round((live / total) * 100) : 0;
    return { total, noPhoto, photoTaken, photoEdited, live, withProperPhoto, percentComplete };
  }, [dishes]);

  // Categories list
  const categories = useMemo(() => {
    const cats = new Set<string>();
    dishes.forEach(d => { if (d.category) cats.add(d.category); });
    return ['All', ...Array.from(cats)];
  }, [dishes]);

  // Filtered dishes
  const filteredDishes = useMemo(() => {
    return dishes.filter(d => {
      const matchesCategory = selectedCategory === 'All' || d.category === selectedCategory;
      const matchesStage = selectedStage === 'All' || d.stage === selectedStage;
      const matchesSearch = searchQuery === '' || 
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesStage && matchesSearch;
    });
  }, [dishes, selectedCategory, selectedStage, searchQuery]);

  // -------------------------------------------------------------
  // FAILURE STATE 1: SETTING IS MISSING
  // -------------------------------------------------------------
  if (missingSettingsList.length > 0) {
    return (
      <main className="min-h-screen bg-stone-900 text-stone-100 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-stone-800 border-2 border-amber-500 rounded-2xl p-6 shadow-2xl text-center space-y-5">
          <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Configuration Setting Missing</h1>
            <p className="text-stone-400 text-sm mt-1">
              The application cannot start because the required environment configuration is missing:
            </p>
          </div>
          <div className="bg-stone-950/80 rounded-xl p-4 text-left border border-stone-700 space-y-2">
            <span className="text-xs uppercase font-semibold text-amber-400 tracking-wider">Missing Variables:</span>
            {missingSettingsList.map(name => (
              <div key={name} className="flex items-center space-x-2 text-rose-400 font-mono text-sm">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span>{name}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-stone-400 leading-relaxed">
            Please define these keys in your <code className="text-stone-200 bg-stone-700 px-1 py-0.5 rounded">.env.local</code> file and restart the Next.js server.
          </p>
          {testOverride !== 'none' && (
            <button 
              onClick={() => { setTestOverride('none'); setMissingSettingsList([]); loadDishes(); }}
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-stone-950 font-semibold rounded-xl text-sm transition"
            >
              Exit Missing Setting Test Mode
            </button>
          )}
        </div>
      </main>
    );
  }

  // -------------------------------------------------------------
  // FAILURE STATE 2: CALL TO SUPABASE FAILED
  // -------------------------------------------------------------
  if (error) {
    return (
      <main className="min-h-screen bg-stone-100 text-stone-900 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border-2 border-rose-400 rounded-2xl p-6 shadow-xl text-center space-y-5">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Supabase Connection Failed</h1>
            <p className="text-stone-600 text-sm mt-1">
              An error occurred while communicating with the Supabase database.
            </p>
          </div>
          <div className="bg-rose-50 rounded-xl p-4 text-left border border-rose-200">
            <span className="text-xs uppercase font-semibold text-rose-700 tracking-wider">Error Details:</span>
            <p className="text-rose-900 font-mono text-xs mt-1 break-words">{error}</p>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <button 
              onClick={() => { setTestOverride('none'); setError(null); loadDishes(); }}
              className="w-full py-3 px-4 bg-stone-900 hover:bg-stone-800 text-white font-medium rounded-xl text-sm transition flex items-center justify-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Database Call</span>
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf8f5] text-stone-900 pb-20">
      
      {/* Test / Diagnostic Bar */}
      <div className="bg-stone-900 text-stone-300 text-xs py-1.5 px-4 flex items-center justify-between border-b border-stone-800 flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-semibold text-stone-200">Menu Photo Board</span>
          <span className="text-stone-500">|</span>
          <span className="text-stone-400">Supabase Connected</span>
        </div>
        <div className="flex items-center space-x-1.5 text-[11px]">
          <span className="text-stone-400 mr-1">Test State:</span>
          <button 
            onClick={() => { setTestOverride('none'); loadDishes(); }}
            className={`px-2 py-0.5 rounded transition ${testOverride === 'none' ? 'bg-emerald-700 text-white font-medium' : 'bg-stone-800 text-stone-400 hover:text-white'}`}
          >
            Live ({dishes.length})
          </button>
          <button 
            onClick={() => setTestOverride('missing_setting')}
            className={`px-2 py-0.5 rounded transition ${testOverride === 'missing_setting' ? 'bg-amber-600 text-white font-medium' : 'bg-stone-800 text-stone-400 hover:text-white'}`}
          >
            Missing Setting
          </button>
          <button 
            onClick={() => setTestOverride('supabase_error')}
            className={`px-2 py-0.5 rounded transition ${testOverride === 'supabase_error' ? 'bg-rose-600 text-white font-medium' : 'bg-stone-800 text-stone-400 hover:text-white'}`}
          >
            DB Error
          </button>
          <button 
            onClick={() => setTestOverride('empty_table')}
            className={`px-2 py-0.5 rounded transition ${testOverride === 'empty_table' ? 'bg-blue-600 text-white font-medium' : 'bg-stone-800 text-stone-400 hover:text-white'}`}
          >
            Empty Table
          </button>
        </div>
      </div>

      {/* Main Single-Screen Content Container */}
      <div className="max-w-3xl mx-auto px-4 pt-4 sm:pt-6 space-y-4">

        {/* Cafe Brand Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-stone-900 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              <Camera className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-stone-950 tracking-tight leading-tight">
                Menu Photo Board
              </h1>
              <p className="text-xs text-stone-700 font-medium">
                Live delivery sync: Zomato • Swiggy • Instagram
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl shadow-sm transition active:scale-95"
            style={{ minHeight: '44px' }}
          >
            <Plus className="w-4 h-4" />
            <span>Add Dish</span>
          </button>
        </header>

        {/* PRIMARY DEFICIT COUNTER BANNER */}
        <section 
          className="rounded-2xl p-4 sm:p-5 shadow-sm border transition-all"
          style={{
            backgroundColor: metrics.noPhoto > 0 ? '#fff1f2' : '#f0fdf4',
            borderColor: metrics.noPhoto > 0 ? '#fecdd3' : '#bbf7d0'
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <span 
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                    metrics.noPhoto > 0 ? 'bg-rose-200 text-rose-900' : 'bg-emerald-200 text-emerald-900'
                  }`}
                >
                  {metrics.noPhoto > 0 ? 'Photography Deficit' : 'Menu Complete'}
                </span>
                <span className="text-xs text-stone-700">
                  {metrics.withProperPhoto} of {metrics.total} dishes covered
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight mt-1 text-stone-950">
                {metrics.noPhoto > 0 ? (
                  <>
                    <span className="text-rose-600">{metrics.noPhoto} dishes</span> still have no proper photo
                  </>
                ) : (
                  <>
                    All <span className="text-emerald-700">{metrics.total} dishes</span> have live photos!
                  </>
                )}
              </h2>
            </div>

            {/* Quick Completion Gauge */}
            <div className="sm:text-right flex items-center sm:flex-col justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-200/50">
              <span className="text-xs font-bold text-stone-800 uppercase tracking-wide">Live Coverage</span>
              <span className="text-2xl font-black text-stone-900">{metrics.percentComplete}%</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-stone-200/80 rounded-full h-2.5 mt-3 overflow-hidden flex">
            <div 
              className="bg-emerald-500 h-full transition-all duration-500" 
              style={{ width: `${(metrics.live / (metrics.total || 1)) * 100}%` }}
              title="Live"
            />
            <div 
              className="bg-blue-500 h-full transition-all duration-500" 
              style={{ width: `${(metrics.photoEdited / (metrics.total || 1)) * 100}%` }}
              title="Photo Edited"
            />
            <div 
              className="bg-amber-400 h-full transition-all duration-500" 
              style={{ width: `${(metrics.photoTaken / (metrics.total || 1)) * 100}%` }}
              title="Photo Taken"
            />
            <div 
              className="bg-rose-400 h-full transition-all duration-500" 
              style={{ width: `${(metrics.noPhoto / (metrics.total || 1)) * 100}%` }}
              title="No Photo"
            />
          </div>

          {/* Pipeline Stage Breakdown Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-stone-200/60">
            <button
              onClick={() => setSelectedStage(selectedStage === 'no_photo' ? 'All' : 'no_photo')}
              className={`p-2 rounded-xl text-left border transition ${
                selectedStage === 'no_photo' ? 'bg-rose-100 border-rose-400 ring-2 ring-rose-400' : 'bg-white/80 border-rose-200 hover:bg-white'
              }`}
            >
              <div className="text-[11px] font-bold text-rose-800 uppercase">1. No Photo</div>
              <div className="text-lg font-black text-rose-900">{metrics.noPhoto}</div>
            </button>

            <button
              onClick={() => setSelectedStage(selectedStage === 'photo_taken' ? 'All' : 'photo_taken')}
              className={`p-2 rounded-xl text-left border transition ${
                selectedStage === 'photo_taken' ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-400' : 'bg-white/80 border-amber-200 hover:bg-white'
              }`}
            >
              <div className="text-[11px] font-bold text-amber-900 uppercase">2. Photo Taken</div>
              <div className="text-lg font-black text-amber-950">{metrics.photoTaken}</div>
            </button>

            <button
              onClick={() => setSelectedStage(selectedStage === 'photo_edited' ? 'All' : 'photo_edited')}
              className={`p-2 rounded-xl text-left border transition ${
                selectedStage === 'photo_edited' ? 'bg-blue-100 border-blue-400 ring-2 ring-blue-400' : 'bg-white/80 border-blue-200 hover:bg-white'
              }`}
            >
              <div className="text-[11px] font-bold text-blue-800 uppercase">3. Photo Edited</div>
              <div className="text-lg font-black text-blue-900">{metrics.photoEdited}</div>
            </button>

            <button
              onClick={() => setSelectedStage(selectedStage === 'live' ? 'All' : 'live')}
              className={`p-2 rounded-xl text-left border transition ${
                selectedStage === 'live' ? 'bg-emerald-100 border-emerald-400 ring-2 ring-emerald-400' : 'bg-white/80 border-emerald-200 hover:bg-white'
              }`}
            >
              <div className="text-[11px] font-bold text-emerald-800 uppercase">4. Live Online</div>
              <div className="text-lg font-black text-emerald-900">{metrics.live}</div>
            </button>
          </div>
        </section>

        {/* Search & Filter Controls */}
        <section className="space-y-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500" />
            <input
              type="text"
              placeholder="Search any dish or category..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900 shadow-sm"
              style={{ minHeight: '44px' }}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Filter Pills (Scrollable horizontally on mobile) */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition border ${
                  selectedCategory === cat 
                    ? 'bg-stone-900 text-white border-stone-900 shadow-sm' 
                    : 'bg-white text-stone-800 border-stone-200 hover:bg-stone-50'
                }`}
                style={{ minHeight: '36px' }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Active Filter Indicators */}
          {(selectedCategory !== 'All' || selectedStage !== 'All' || searchQuery !== '') && (
            <div className="flex items-center justify-between text-xs text-stone-700 bg-stone-100/80 px-3 py-1.5 rounded-lg">
              <span>
                Showing <strong>{filteredDishes.length}</strong> of {dishes.length} dishes
                {selectedCategory !== 'All' && ` in "${selectedCategory}"`}
                {selectedStage !== 'All' && ` at stage "${STAGE_CONFIG[selectedStage as DishStage]?.label}"`}
              </span>
              <button 
                onClick={() => { setSelectedCategory('All'); setSelectedStage('All'); setSearchQuery(''); }}
                className="text-stone-900 font-bold hover:underline"
              >
                Reset filters
              </button>
            </div>
          )}
        </section>

        {/* -------------------------------------------------------------
            FAILURE STATE 3: TABLE IS EMPTY
            ------------------------------------------------------------- */}
        {dishes.length === 0 && !loading && (
          <section className="bg-white border border-stone-200 rounded-2xl p-8 text-center space-y-4 shadow-sm my-6">
            <div className="w-16 h-16 bg-stone-100 text-stone-500 rounded-full flex items-center justify-center mx-auto">
              <UtensilsCrossed className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-stone-900">Your Menu Photo Board is Empty</h3>
              <p className="text-stone-600 text-sm max-w-sm mx-auto mt-1">
                There are currently no menu dishes tracked in your database table. Add your dishes or load demo items to begin tracking photography stages.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setIsAddOpen(true)}
                className="w-full sm:w-auto px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-sm font-semibold rounded-xl transition"
                style={{ minHeight: '44px' }}
              >
                + Add Your First Dish
              </button>
              <button
                onClick={handleSeedDemoData}
                className="w-full sm:w-auto px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-950 text-sm font-semibold rounded-xl transition"
                style={{ minHeight: '44px' }}
              >
                Load Realistic Demo Dishes
              </button>
            </div>
          </section>
        )}

        {/* Dish List Cards (Single Screen) */}
        {loading ? (
          <div className="py-12 text-center text-stone-500 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-stone-600" />
            <p className="text-sm font-medium">Loading dishes from Supabase...</p>
          </div>
        ) : (
          <section className="space-y-2.5">
            {filteredDishes.map((dish) => {
              const stage = STAGE_CONFIG[dish.stage];
              const isLive = dish.stage === 'live';
              const isJustUpdated = lastActionDishId === dish.id;

              return (
                <div
                  key={dish.id}
                  onClick={() => advanceStage(dish)}
                  className={`group relative bg-white border rounded-2xl p-3.5 sm:p-4 shadow-sm hover:shadow-md transition-all cursor-pointer select-none active:scale-[0.99] ${
                    isJustUpdated ? 'ring-2 ring-stone-900' : ''
                  }`}
                  style={{
                    borderLeftWidth: '6px',
                    borderLeftColor: stage.color,
                    minHeight: '64px'
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`${dish.name}, stage: ${stage.label}. Tap to advance.`}
                >
                  <div className="flex items-start justify-between gap-3">
                    
                    {/* Left Details */}
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="text-[11px] font-bold text-stone-600 uppercase tracking-wider bg-stone-100 px-2 py-0.5 rounded-md">
                          {dish.category}
                        </span>
                        <span className="text-xs font-semibold text-stone-700">
                          ₹{dish.price}
                        </span>
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-stone-950 truncate">
                        {dish.name}
                      </h3>

                      {dish.description && (
                        <p className="text-xs text-stone-600 line-clamp-1">
                          {dish.description}
                        </p>
                      )}
                    </div>

                    {/* Right Interactive Controls */}
                    <div className="flex items-center space-x-2 shrink-0">
                      
                      {/* Undo / Revert Button */}
                      {stage.prevStage && (
                        <button
                          onClick={(e) => revertStage(e, dish)}
                          title={`Undo back to ${STAGE_CONFIG[stage.prevStage].label}`}
                          className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition"
                          style={{ minWidth: '44px', minHeight: '44px' }}
                          aria-label="Revert stage"
                        >
                          <RotateCcw className="w-4 h-4 mx-auto" />
                        </button>
                      )}

                      {/* Current Stage Badge / Advance Target */}
                      <div 
                        className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition ${stage.badgeBg} ${stage.badgeText}`}
                        style={{ minHeight: '44px' }}
                      >
                        {dish.stage === 'no_photo' && <Camera className="w-3.5 h-3.5" />}
                        {dish.stage === 'photo_taken' && <Clock className="w-3.5 h-3.5" />}
                        {dish.stage === 'photo_edited' && <Sparkles className="w-3.5 h-3.5" />}
                        {dish.stage === 'live' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}

                        <span>{stage.label}</span>

                        {!isLive && (
                          <ChevronRight className="w-3.5 h-3.5 ml-0.5 text-stone-500 group-hover:translate-x-0.5 transition" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Operational Destination Label for Live Stage */}
                  {dish.stage === 'live' && (
                    <div className="mt-2 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-emerald-800 font-medium">
                      <span>Active on Zomato • Swiggy • Instagram</span>
                      <span className="flex items-center text-emerald-700">
                        Live <CheckCircle2 className="w-3 h-3 ml-1" />
                      </span>
                    </div>
                  )}
                  {dish.stage === 'photo_edited' && (
                    <div className="mt-2 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-blue-700 font-medium">
                      <span>Ready to upload. Tap to mark Live.</span>
                      <span className="flex items-center text-blue-600">
                        Tap when live <ArrowRight className="w-3 h-3 ml-1" />
                      </span>
                    </div>
                  )}
                  {dish.stage === 'photo_taken' && (
                    <div className="mt-2 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-amber-900 font-medium">
                      <span>Raw shot saved. Awaiting post-processing.</span>
                      <span className="flex items-center text-amber-900">
                        Tap when edited <ArrowRight className="w-3 h-3 ml-1" />
                      </span>
                    </div>
                  )}
                  {dish.stage === 'no_photo' && (
                    <div className="mt-2 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-rose-800 font-medium">
                      <span>Needs camera shoot. Tap when plate photographed.</span>
                      <span className="flex items-center text-rose-800">
                        Tap when shot <ArrowRight className="w-3 h-3 ml-1" />
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        )}

      </div>

      {/* Slide-over / Modal: Add Dish */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-stone-100">
              <h3 className="text-lg font-bold text-stone-900">Add New Dish</h3>
              <button 
                onClick={() => setIsAddOpen(false)}
                className="text-stone-500 hover:text-stone-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddDish} className="space-y-3.5">
              {addError && (
                <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-xl border border-rose-200">
                  {addError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Dish Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Saffron Pistachio Kulfi"
                  value={newDishName}
                  onChange={e => setNewDishName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-stone-900 focus:outline-none"
                  style={{ minHeight: '44px' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={newDishCategory}
                    onChange={e => setNewDishCategory(e.target.value)}
                    className="w-full px-3 py-2.5 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-stone-900 focus:outline-none bg-white"
                    style={{ minHeight: '44px' }}
                  >
                    <option value="Brunch & Mains">Brunch & Mains</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Bakery">Bakery</option>
                    <option value="Desserts">Desserts</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    value={newDishPrice}
                    onChange={e => setNewDishPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-stone-300 rounded-xl text-sm focus:ring-2 focus:ring-stone-900 focus:outline-none"
                    style={{ minHeight: '44px' }}
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 py-2.5 border border-stone-300 text-stone-700 font-semibold rounded-xl text-sm hover:bg-stone-50"
                  style={{ minHeight: '44px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-semibold rounded-xl text-sm disabled:opacity-50 transition"
                  style={{ minHeight: '44px' }}
                >
                  {submitting ? 'Saving...' : 'Save Dish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
