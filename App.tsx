
import React, { useState, useEffect, useCallback } from 'react';
// @ts-ignore - Resolving TS error for missing exported members in some environments
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { LibraryItem, TeachingItem, ActivityItem, TracerProject, PublicationItem, PresentationItem } from './types';
import { fetchLibrary } from './services/gasService';
import { fetchTeachingPaginated } from './services/TeachingService';
import { fetchActivitiesPaginated } from './services/ActivityService';
import { fetchTracerProjects } from './services/TracerService';
import { fetchPublicationsPaginated } from './services/PublicationService';
import LibraryMain from './components/Library/LibraryMain';
import LibraryForm from './components/Library/LibraryForm';
import LibraryEditForm from './components/Library/LibraryEditForm';
import AllPresentation from './components/Presenter/AllPresentation';
import AllQuestion from './components/QuestionBank/AllQuestion';
import GapFinderModule from './components/Research/GapFinderModule';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import SettingsView from './components/Settings/SettingsView';
import UserProfileView from './components/Profile/UserProfileView';
import FindArticle from './components/Research/Literature/FindArticle';
import FindBook from './components/Research/Literature/FindBook';
import ArchivedArticle from './components/Research/Literature/ArchivedArticle';
import ArchivedBook from './components/Research/Literature/ArchivedBook';
import NotebookMain from './components/Notebook/NotebookMain';
import AllReview from './components/Research/LiteratureReview/AllReview';
import ReviewDetail from './components/Research/LiteratureReview/ReviewDetail';
import DashboardMain from './components/Dashboard/DashboardMain';
// Placeholder for the upcoming modules
const ActivityMain = React.lazy(() => import('./components/Activities/ActivityMain'));
const TeachingMain = React.lazy(() => import('./components/Teaching/TeachingMain'));
const CVMain = React.lazy(() => import('./components/CVArchitect/CVMain'));
const ColleagueMain = React.lazy(() => import('./components/Colleague/ColleagueMain'));
const TracerMain = React.lazy(() => import('./components/Research/Tracer/TracerMain'));
const TracerDetail = React.lazy(() => import('./components/Research/Tracer/TracerDetail'));
const SharboxMain = React.lazy(() => import('./components/Sharbox/SharboxMain'));
import { BRAND_ASSETS } from './assets';
import { GlobalAppLoader } from './components/Common/LoadingComponents';

// Global Scroll Reset Component
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const App: React.FC = () => {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [teachingItems, setTeachingItems] = useState<TeachingItem[]>([]);
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
  const [tracerProjects, setTracerProjects] = useState<TracerProject[]>([]);
  const [publicationItems, setPublicationItems] = useState<PublicationItem[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Parallel fetch for all main data sets to minimize initial loading time
      const [libData, tRes, aRes, trRes, pRes] = await Promise.all([
        fetchLibrary(),
        fetchTeachingPaginated(1, 100, "", "", ""),
        fetchActivitiesPaginated(1, 100, "", "", "", "All"),
        fetchTracerProjects(1, 100, ""),
        fetchPublicationsPaginated(1, 100, "")
      ]);
      
      setItems(libData);
      setTeachingItems(tRes.items);
      setActivityItems(aRes.items);
      setTracerProjects(trRes.items);
      setPublicationItems(pRes.items);
    } catch (e) {
      console.error("Xeenaps Data Synchronization Error", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- GLOBAL OPTIMISTIC SYNC LISTENERS ---
  // These listeners are placed here at the root so they stay active 24/7
  // regardless of which page the user is currently visiting.
  useEffect(() => {
    // 1. Library Listeners
    const handleLibraryUpdate = (e: any) => {
      const item = e.detail as LibraryItem;
      setItems(prev => {
        const index = prev.findIndex(i => i.id === item.id);
        return index > -1 ? prev.map(i => i.id === item.id ? item : i) : [item, ...prev];
      });
    };
    const handleLibraryDelete = (e: any) => {
      setItems(prev => prev.filter(i => i.id !== e.detail));
    };

    // 2. Teaching Listeners
    const handleTeachingUpdate = (e: any) => {
      const item = e.detail as TeachingItem;
      setTeachingItems(prev => {
        const index = prev.findIndex(i => i.id === item.id);
        return index > -1 ? prev.map(i => i.id === item.id ? item : i) : [item, ...prev];
      });
    };
    const handleTeachingDelete = (e: any) => {
      setTeachingItems(prev => prev.filter(i => i.id !== e.detail));
    };

    // 3. Activity Listeners
    const handleActivityUpdate = (e: any) => {
      const item = e.detail as ActivityItem;
      setActivityItems(prev => {
        const index = prev.findIndex(i => i.id === item.id);
        return index > -1 ? prev.map(i => i.id === item.id ? item : i) : [item, ...prev];
      });
    };
    const handleActivityDelete = (e: any) => {
      setActivityItems(prev => prev.filter(i => i.id !== e.detail));
    };

    // 4. Tracer Listeners
    const handleTracerUpdate = (e: any) => {
      const item = e.detail as TracerProject;
      setTracerProjects(prev => {
        const index = prev.findIndex(i => i.id === item.id);
        return index > -1 ? prev.map(i => i.id === item.id ? item : i) : [item, ...prev];
      });
    };
    const handleTracerDelete = (e: any) => {
      setTracerProjects(prev => prev.filter(i => i.id !== e.detail));
    };

    // 5. Publication Listeners
    const handlePublicationUpdate = (e: any) => {
      const item = e.detail as PublicationItem;
      setPublicationItems(prev => {
        const index = prev.findIndex(i => i.id === item.id);
        return index > -1 ? prev.map(i => i.id === item.id ? item : i) : [item, ...prev];
      });
    };
    const handlePublicationDelete = (e: any) => {
      setPublicationItems(prev => prev.filter(i => i.id !== e.detail));
    };

    // 6. Presentation Listeners (CASCADE CLEANUP LOGIC)
    const handlePresentationDelete = (e: any) => {
      const deletedId = e.detail;
      // Real-time cleanup of presentation references in Teaching Sessions
      setTeachingItems(prev => prev.map(session => ({
        ...session,
        presentationId: Array.isArray(session.presentationId) 
          ? session.presentationId.filter(p => p.id !== deletedId)
          : []
      })));
    };

    // 7. Question Listeners (CASCADE CLEANUP LOGIC)
    const handleQuestionDelete = (e: any) => {
      const deletedId = e.detail;
      // Real-time cleanup of question references in Teaching Sessions
      setTeachingItems(prev => prev.map(session => ({
        ...session,
        questionBankId: Array.isArray(session.questionBankId)
          ? session.questionBankId.filter(q => q.id !== deletedId)
          : []
      })));
    };

    window.addEventListener('xeenaps-library-updated', handleLibraryUpdate);
    window.addEventListener('xeenaps-library-deleted', handleLibraryDelete);
    window.addEventListener('xeenaps-teaching-updated', handleTeachingUpdate);
    window.addEventListener('xeenaps-teaching-deleted', handleTeachingDelete);
    window.addEventListener('xeenaps-activity-updated', handleActivityUpdate);
    window.addEventListener('xeenaps-activity-deleted', handleActivityDelete);
    window.addEventListener('xeenaps-tracer-updated', handleTracerUpdate);
    window.addEventListener('xeenaps-tracer-deleted', handleTracerDelete);
    window.addEventListener('xeenaps-publication-updated', handlePublicationUpdate);
    window.addEventListener('xeenaps-publication-deleted', handlePublicationDelete);
    window.addEventListener('xeenaps-presentation-deleted', handlePresentationDelete);
    window.addEventListener('xeenaps-question-deleted', handleQuestionDelete);

    return () => {
      window.removeEventListener('xeenaps-library-updated', handleLibraryUpdate);
      window.removeEventListener('xeenaps-library-deleted', handleLibraryDelete);
      window.removeEventListener('xeenaps-teaching-updated', handleTeachingUpdate);
      window.removeEventListener('xeenaps-teaching-deleted', handleTeachingDelete);
      window.removeEventListener('xeenaps-activity-updated', handleActivityUpdate);
      window.removeEventListener('xeenaps-activity-deleted', handleActivityDelete);
      window.removeEventListener('xeenaps-tracer-updated', handleTracerUpdate);
      window.removeEventListener('xeenaps-tracer-deleted', handleTracerDelete);
      window.removeEventListener('xeenaps-publication-updated', handlePublicationUpdate);
      window.removeEventListener('xeenaps-publication-deleted', handlePublicationDelete);
      window.removeEventListener('xeenaps-presentation-deleted', handlePresentationDelete);
      window.removeEventListener('xeenaps-question-deleted', handleQuestionDelete);
    };
  }, []);

  useEffect(() => {
    const forceCloseSidebar = () => {
      setIsMobileSidebarOpen(false);
    };

    const handleReentry = () => {
      if (document.visibilityState === 'visible') {
        forceCloseSidebar();
      }
    };

    window.addEventListener('visibilitychange', handleReentry);
    window.addEventListener('pageshow', handleReentry);
    window.addEventListener('focus', handleReentry);
    window.addEventListener('blur', forceCloseSidebar); 
    
    return () => {
      window.removeEventListener('visibilitychange', handleReentry);
      window.removeEventListener('pageshow', handleReentry);
      window.removeEventListener('focus', handleReentry);
      window.removeEventListener('blur', forceCloseSidebar);
    };
  }, []);

  return (
    <Router>
      <ScrollToTop />
      <div className={`flex min-h-screen bg-white text-[#004A74] ${isLoading ? 'pointer-events-none select-none' : ''}`}>
        {isMobileSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[70] lg:hidden transition-opacity duration-500"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        <Sidebar 
          isMobileOpen={isMobileSidebarOpen} 
          onMobileClose={() => setIsMobileSidebarOpen(false)} 
        />

        <main className="flex-1 flex flex-col px-4 md:px-8 lg:px-12 relative min-w-0 bg-white z-0">
          <Header 
            searchQuery={searchQuery} 
            setSearchQuery={setQuery => setSearchQuery(setQuery)} 
            onRefresh={loadData}
          />

          <div className="mt-4 lg:mt-6 pb-20 relative bg-white">
            <React.Suspense fallback={<GlobalAppLoader />}>
              <Routes>
                <Route 
                  path="/dashboard" 
                  element={
                    <DashboardMain 
                      libraryItems={items} 
                      teachingItems={teachingItems}
                      activityItems={activityItems}
                      tracerProjects={tracerProjects}
                      publicationItems={publicationItems}
                      onRefresh={loadData} 
                    />
                  } 
                />
                <Route path="/" element={<LibraryMain items={items} isLoading={isLoading} onRefresh={loadData} globalSearch={searchQuery} isMobileSidebarOpen={isMobileSidebarOpen} />} />
                <Route path="/favorite" element={<LibraryMain items={items} isLoading={isLoading} onRefresh={loadData} globalSearch={searchQuery} isMobileSidebarOpen={isMobileSidebarOpen} />} />
                <Route path="/bookmark" element={<LibraryMain items={items} isLoading={isLoading} onRefresh={loadData} globalSearch={searchQuery} isMobileSidebarOpen={isMobileSidebarOpen} />} />
                
                <Route path="/notebook" element={<NotebookMain libraryItems={items} isMobileSidebarOpen={isMobileSidebarOpen} />} />
                <Route path="/find-article" element={<FindArticle />} />
                <Route path="/find-book" element={<FindBook />} />
                <Route path="/archived-articles" element={<ArchivedArticle />} />
                <Route path="/archived-books" element={<ArchivedBook />} />
                <Route path="/sharbox" element={<SharboxMain />} />

                {/* Fix: Passed isMobileSidebarOpen down to GapFinderModule */}
                <Route path="/research/*" element={<GapFinderModule items={items} isMobileSidebarOpen={isMobileSidebarOpen} />} />
                <Route path="/research/literature-review" element={<AllReview />} />
                <Route path="/research/literature-review/:id" element={<ReviewDetail libraryItems={items} isMobileSidebarOpen={isMobileSidebarOpen} />} />
                <Route path="/research/tracer" element={<TracerMain />} />
                {/* Fix: Passed isMobileSidebarOpen down to TracerDetail */}
                <Route path="/research/tracer/:id" element={<TracerDetail libraryItems={items} isMobileSidebarOpen={isMobileSidebarOpen} />} />
                
                <Route path="/presentations" element={<AllPresentation items={items} />} />
                <Route path="/questions" element={<AllQuestion items={items} />} />
                
                <Route path="/activities/*" element={<ActivityMain />} />

                <Route path="/teaching/*" element={<TeachingMain />} />

                <Route path="/cv-architect/*" element={<CVMain />} />

                <Route path="/colleagues/*" element={<ColleagueMain />} />
                
                <Route path="/add" element={isLoading ? <GlobalAppLoader /> : <LibraryForm onComplete={loadData} items={items} />} />
                <Route path="/edit/:id" element={isLoading ? <GlobalAppLoader /> : <LibraryEditForm onComplete={loadData} items={items} />} />
                <Route path="/settings" element={isLoading ? <GlobalAppLoader /> : <SettingsView />} />
                <Route path="/profile" element={isLoading ? <GlobalAppLoader /> : <UserProfileView />} />
                
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </React.Suspense>
          </div>
        </main>

        <button 
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          className={`fixed bottom-6 right-6 lg:hidden z-[90] w-16 h-16 bg-transparent flex items-center justify-center p-1 transition-all duration-300 rounded-full outline-none focus:outline-none hover:scale-110 active:scale-95 ${!isMobileSidebarOpen ? 'animate-xeenaps-bounce' : ''} ${isLoading ? 'opacity-50 grayscale' : ''}`}
        >
          <img 
            src={BRAND_ASSETS.LOGO_ICON} 
            className={`w-full h-full object-contain transition-all duration-700 ease-in-out ${isMobileSidebarOpen ? 'rotate-[360deg] scale-100 brightness-110' : 'rotate-0 opacity-100'}`}
            alt="Toggle Sidebar"
          />
        </button>
      </div>
    </Router>
  );
};

export default App;
