/**
 * XEENAPS PKM - MAIN ROUTER
 */

function doGet(e) {
  try {
    const action = e.parameter.action;
    
    // ACTION: checkQuota (GET support for easy pinging/monitoring)
    if (action === 'checkQuota') {
      const quota = Drive.About.get({fields: 'storageQuota'}).storageQuota;
      const remaining = parseInt(quota.limit) - parseInt(quota.usage);
      return createJsonResponse({ status: 'success', remaining: remaining });
    }

    // ACTION: getFileContent (Support for Sharding Retrieval)
    if (action === 'getFileContent') {
      const fileId = e.parameter.fileId;
      if (!fileId) return createJsonResponse({ status: 'error', message: 'No fileId provided' });
      const content = DriveApp.getFileById(fileId).getBlob().getDataAsString();
      return createJsonResponse({ status: 'success', content: content });
    }

    if (action === 'getLibrary') {
      const page = parseInt(e.parameter.page || "1");
      const limit = parseInt(e.parameter.limit || "25");
      const search = e.parameter.search || "";
      const type = e.parameter.type || "All";
      const path = e.parameter.path || "";
      const sortKey = e.parameter.sortKey || "createdAt";
      const sortDir = e.parameter.sortDir || "desc";
      
      const result = getPaginatedItems(CONFIG.SPREADSHEETS.LIBRARY, "Collections", page, limit, search, type, path, sortKey, sortDir);
      return createJsonResponse({ status: 'success', data: result.items, totalCount: result.totalCount });
    }

    // NEW: getNotifications with Server-Side Date Filtering
    if (action === 'getNotifications') {
      const unreadSharbox = getSharboxItemsFromRegistry('Inbox').filter(i => !i.isRead);
      const allUnfinished = getGlobalUnfinishedTodos();
      
      // Calculate Time Thresholds
      const today = new Date();
      today.setHours(0,0,0,0);
      const limitDate = new Date(today);
      limitDate.setDate(today.getDate() + 3); // Threshold: 3 days from now
      
      const criticalTodos = allUnfinished.filter(t => {
        if (!t.deadline) return false;
        const d = new Date(t.deadline);
        // Only include if deadline is past (overdue), today, or within 3 days
        return d <= limitDate;
      });

      return createJsonResponse({
        status: 'success',
        data: {
          sharbox: unreadSharbox,
          todos: criticalTodos
        }
      });
    }

    // NEW: getSharboxItems
    if (action === 'getSharboxItems') {
      const type = e.parameter.type || 'Inbox'; // 'Inbox' or 'Sent'
      const result = getSharboxItemsFromRegistry(type);
      return createJsonResponse({ status: 'success', data: result });
    }

    // NEW: getNotes (NOTEBOOK MODULE)
    if (action === 'getNotes') {
      const page = parseInt(e.parameter.page || "1");
      const limit = parseInt(e.parameter.limit || "25");
      const search = e.parameter.search || "";
      const collectionId = e.parameter.collectionId || "";
      const sortKey = e.parameter.sortKey || "createdAt";
      const sortDir = e.parameter.sortDir || "desc";
      const result = getNotesFromRegistry(page, limit, search, collectionId, sortKey, sortDir);
      return createJsonResponse({ status: 'success', data: result.items, totalCount: result.totalCount });
    }

    // NEW: Tracer Project Retrieval
    if (action === 'getTracerProjects') {
      const page = parseInt(e.parameter.page || "1");
      const limit = parseInt(e.parameter.limit || "25");
      const search = e.parameter.search || "";
      const result = getTracerProjectsFromRegistry(page, limit, search);
      return createJsonResponse({ status: 'success', data: result.items, totalCount: result.totalCount });
    }

    // NEW: Tracer Log Retrieval
    if (action === 'getTracerLogs') {
      const projectId = e.parameter.projectId;
      const result = getTracerLogsFromRegistry(projectId);
      return createJsonResponse({ status: 'success', data: result });
    }

    // NEW: Tracer Reference Retrieval
    if (action === 'getTracerReferences') {
      const projectId = e.parameter.projectId;
      const result = getTracerReferencesFromRegistry(projectId);
      return createJsonResponse({ status: 'success', data: result });
    }

    // NEW: Tracer Todo Retrieval
    if (action === 'getTracerTodos') {
      const projectId = e.parameter.projectId;
      const result = getTracerTodosFromRegistry(projectId);
      return createJsonResponse({ status: 'success', data: result });
    }

    // NEW: Tracer Finance Retrieval
    if (action === 'getTracerFinance') {
      const projectId = e.parameter.projectId;
      const startDate = e.parameter.startDate || "";
      const endDate = e.parameter.endDate || "";
      const search = e.parameter.search || "";
      const result = getTracerFinanceFromRegistry(projectId, startDate, endDate, search);
      return createJsonResponse({ status: 'success', data: result });
    }

    // NEW: Tracer Finance Export (STITCHING ENGINE)
    if (action === 'getFinanceExportData') {
      const projectId = e.parameter.projectId;
      const result = getFinanceExportDataFromRegistry(projectId);
      return createJsonResponse({ status: 'success', data: result });
    }

    // NEW: Tracer Finance Premium Export (Excel/PDF)
    // MODIFIED: Pass currency to the generator
    if (action === 'generateFinanceExport') {
      const { projectId, format, currency } = e.parameter;
      const result = generateFinanceExportFileFromRegistry(projectId, format, currency);
      return createJsonResponse(result);
    }

    // NEW: getReviews (LITERATURE REVIEW MODULE)
    if (action === 'getReviews') {
      const page = parseInt(e.parameter.page || "1");
      const limit = parseInt(e.parameter.limit || "20");
      const search = e.parameter.search || "";
      const sortKey = e.parameter.sortKey || "createdAt";
      const sortDir = e.parameter.sortDir || "desc";
      const result = getReviewsFromRegistry(page, limit, search, sortKey, sortDir);
      return createJsonResponse({ status: 'success', data: result.items, totalCount: result.totalCount });
    }

    // NEW: getConsultations
    if (action === 'getConsultations') {
      const collectionId = e.parameter.collectionId;
      const page = parseInt(e.parameter.page || "1");
      const limit = parseInt(e.parameter.limit || "20");
      const search = e.parameter.search || "";
      const result = getConsultationsFromRegistry(collectionId, page, limit, search);
      return createJsonResponse({ status: 'success', data: result.items, totalCount: result.totalCount });
    }

    // NEW: getColleagues (SERVER-SIDE SEARCH & PAGINATION)
    if (action === 'getColleagues') {
      const page = parseInt(e.parameter.page || "1");
      const limit = parseInt(e.parameter.limit || "20");
      const search = e.parameter.search || "";
      const sortKey = e.parameter.sortKey || "name";
      const sortDir = e.parameter.sortDir || "asc";
      const result = getColleaguesFromRegistry(page, limit, search, sortKey, sortDir);
      return createJsonResponse({ status: 'success', data: result.items, totalCount: result.totalCount });
    }

    // NEW: getTeaching (UPDATED FOR SERVER-SIDE DATE FILTERING)
    if (action === 'getTeaching') {
      const page = parseInt(e.parameter.page || "1");
      const limit = parseInt(e.parameter.limit || "25");
      const search = e.parameter.search || "";
      const startDate = e.parameter.startDate || "";
      const endDate = e.parameter.endDate || "";
      const result = getTeachingFromRegistry(page, limit, search, startDate, endDate);
      return createJsonResponse({ status: 'success', data: result.items, totalCount: result.totalCount });
    }

    // NEW: getActivities (UPDATED FOR FILTERS)
    if (action === 'getActivities') {
      const page = parseInt(e.parameter.page || "1");
      const limit = parseInt(e.parameter.limit || "25");
      const search = e.parameter.search || "";
      const type = e.parameter.type || "All";
      const startDate = e.parameter.startDate || "";
      const endDate = e.parameter.endDate || "";
      const result = getActivitiesFromRegistry(page, limit, search, startDate, endDate, type);
      return createJsonResponse({ status: 'success', data: result.items, totalCount: result.totalCount });
    }

    // NEW: Profile Retrieval
    if (action === 'getProfile') {
      return createJsonResponse({ status: 'success', data: getProfileFromRegistry() });
    }

    // NEW: Education History Retrieval
    if (action === 'getEducation') {
      return createJsonResponse({ status: 'success', data: getEducationFromRegistry() });
    }

    // NEW: Career History Retrieval
    if (action === 'getCareer') {
      return createJsonResponse({ status: 'success', data: getCareerFromRegistry() });
    }

    // NEW: getPublication
    if (action === 'getPublication') {
      const page = parseInt(e.parameter.page || "1");
      const limit = parseInt(e.parameter.limit || "25");
      const search = e.parameter.search || "";
      const result = getPublicationFromRegistry(page, limit, search);
      return createJsonResponse({ status: 'success', data: result.items, totalCount: result.totalCount });
    }

    // NEW: CV List Retrieval
    if (action === 'getCVList') {
      return createJsonResponse({ status: 'success', data: getCVFromRegistry() });
    }

    // NEW: searchGlobalArticles (Proxy for OpenAlex)
    if (action === 'searchGlobalArticles') {
      return createJsonResponse(handleGlobalArticleSearch(e.parameter));
    }

    // NEW: searchGlobalBooks (Proxy for Open Library)
    if (action === 'searchGlobalBooks') {
      return createJsonResponse(handleGlobalBookSearch(e.parameter));
    }

    // NEW: getArchivedArticles (UPDATED FOR PAGINATION & SEARCH)
    if (action === 'getArchivedArticles') {
      const page = parseInt(e.parameter.page || "1");
      const limit = parseInt(e.parameter.limit || "25");
      const search = e.parameter.search || "";
      const sortKey = e.parameter.sortKey || "createdAt";
      const sortDir = e.parameter.sortDir || "desc";
      
      const result = getArchivedArticlesFromRegistry(page, limit, search, sortKey, sortDir);
      return createJsonResponse({ status: 'success', data: result.items, totalCount: result.totalCount });
    }

    // NEW: getArchivedBooks
    if (action === 'getArchivedBooks') {
      const page = parseInt(e.parameter.page || "1");
      const limit = parseInt(e.parameter.limit || "25");
      const search = e.parameter.search || "";
      const sortKey = e.parameter.sortKey || "createdAt";
      const sortDir = e.parameter.sortDir || "desc";
      
      const result = getArchivedBooksFromRegistry(page, limit, search, sortKey, sortDir);
      return createJsonResponse({ status: 'success', data: result.items, totalCount: result.totalCount });
    }

    // NEW: getBrainstorming
    if (action === 'getBrainstorming') {
      const page = parseInt(e.parameter.page || "1");
      const limit = parseInt(e.parameter.limit || "25");
      const search = e.parameter.search || "";
      const result = getBrainstormingFromRegistry(page, limit, search);
      return createJsonResponse({ status: 'success', data: result.items, totalCount: result.totalCount });
    }

    // NEW: getResearchProjects
    if (action === 'getResearchProjects') {
      const page = parseInt(e.parameter.page || "1");
      const limit = parseInt(e.parameter.limit || "25");
      const search = e.parameter.search || "";
      const result = getResearchProjectsFromRegistry(page, limit, search);
      return createJsonResponse({ status: 'success', data: result.items, totalCount: result.totalCount });
    }

    // NEW: getProjectSources
    if (action === 'getProjectSources') {
      const projectId = e.parameter.projectId;
      return createJsonResponse({ status: 'success', data: getProjectSourcesFromRegistry(projectId) });
    }

    // NEW: getGapLog (Research Gap Log Retrieval)
    if (action === 'getGapLog') {
      const sourceId = e.parameter.sourceId;
      return createJsonResponse({ status: 'success', data: getGapLogsBySource(sourceId) });
    }

    // NEW: getRelatedPresentations (UPDATED FOR PAGINATION)
    if (action === 'getRelatedPresentations') {
      const collectionId = e.parameter.collectionId;
      if (!collectionId) return createJsonResponse({ status: 'error', message: 'No collectionId provided' });
      const page = parseInt(e.parameter.page || "1");
      const limit = parseInt(e.parameter.limit || "20");
      const search = e.parameter.search || "";
      const sortKey = e.parameter.sortKey || "createdAt";
      const sortDir = e.parameter.sortDir || "desc";
      
      const result = getPresentationsByCollection(collectionId, page, limit, search, sortKey, sortDir);
      return createJsonResponse({ status: 'success', data: result.items, totalCount: result.totalCount });
    }

    // NEW: getAllPresentations (UPDATED FOR PARAMETERS)
    if (action === 'getAllPresentations') {
      const page = parseInt(e.parameter.page || "1");
      const limit = parseInt(e.parameter.limit || "25");
      const search = e.parameter.search || "";
      const sortKey = e.parameter.sortKey || "createdAt";
      const sortDir = e.parameter.sortDir || "desc";
      const startDate = e.parameter.startDate || "";
      const endDate = e.parameter.endDate || "";
      
      const result = getAllPresentationsFromRegistry(page, limit, search, sortKey, sortDir, startDate, endDate);
      return createJsonResponse({ status: 'success', data: result.items, totalCount: result.totalCount });
    }

    // NEW: getQuestionsByCollection (MODIFIED FOR PAGINATION & SEARCH)
    if (action === 'getQuestionsByCollection') {
      const collectionId = e.parameter.collectionId;
      if (!collectionId) return createJsonResponse({ status: 'error', message: 'No collectionId provided' });
      const page = parseInt(e.parameter.page || "1");
      const limit = parseInt(e.parameter.limit || "20");
      const search = e.parameter.search || "";
      const bloomFilter = e.parameter.bloomFilter || "All";
      
      const result = getQuestionsFromRegistry(collectionId, page, limit, search, bloomFilter);
      return createJsonResponse({ status: 'success', data: result.items, totalCount: result.totalCount });
    }

    // NEW: getAllQuestions (GLOBAL)
    if (action === 'getAllQuestions') {
      const page = parseInt(e.parameter.page || "1");
      const limit = parseInt(e.parameter.limit || "20");
      const search = e.parameter.search || "";
      const bloomFilter = e.parameter.bloomFilter || "All";
      const startDate = e.parameter.startDate || "";
      const endDate = e.parameter.endDate || "";
      const sortKey = e.parameter.sortKey || "createdAt";
      const sortDir = e.parameter.sortDir || "desc";
      
      const result = getAllQuestionsFromRegistry(page, limit, search, bloomFilter, startDate, endDate, sortKey, sortDir);
      return createJsonResponse({ status: 'success', data: result.items, totalCount: result.totalCount });
    }

    if (action === 'getAiConfig') return createJsonResponse({ status: 'success', data: getProviderModel('GEMINI') });
    return createJsonResponse({ status: 'error', message: 'Invalid action: ' + action });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch(e) {
    return createJsonResponse({ status: 'error', message: 'Malformed JSON request' });
  }
  
  const action = body.action;
  
  try {
    if (action === 'setupDatabase') return createJsonResponse(setupDatabase());
    if (action === 'setupSharboxDatabase') return createJsonResponse(setupSharboxDatabase());
    if (action === 'setupNotebookDatabase') return createJsonResponse(setupNotebookDatabase());
    if (action === 'setupColleagueDatabase') return createJsonResponse(setupColleagueDatabase());
    if (action === 'setupTeachingDatabase') return createJsonResponse(setupTeachingDatabase());
    if (action === 'setupResearchDatabase') return createJsonResponse(setupResearchDatabase());
    if (action === 'setupBrainstormingDatabase') return createJsonResponse(setupBrainstormingDatabase());
    if (action === 'setupPublicationDatabase') return createJsonResponse(setupPublicationDatabase());
    if (action === 'setupProfileDatabase') return createJsonResponse(setupProfileDatabase());
    if (action === 'setupActivitiesDatabase') return createJsonResponse(setupActivitiesDatabase());
    if (action === 'setupCVDatabase') return createJsonResponse(setupCVDatabase());
    if (action === 'setupConsultationDatabase') return createJsonResponse(setupConsultationDatabase());
    if (action === 'setupReviewDatabase') return createJsonResponse(setupReviewDatabase());
    if (action === 'setupTracerDatabase') return createJsonResponse(setupTracerDatabase());
    if (action === 'setupBookArchiveDatabase') return createJsonResponse(setupBookArchiveDatabase());
    
    // NEW: Sharbox Actions
    if (action === 'sendToSharbox') return createJsonResponse(handleSendToSharbox(body.targetUniqueAppId, body.receiverName, body.receiverPhotoUrl, body.message, body.item, body.receiverContacts));
    if (action === 'claimSharboxItem') return createJsonResponse(handleClaimSharboxItem(body.id));
    if (action === 'deleteSharboxItem') return createJsonResponse(deleteSharboxItem(body.id, body.type));
    if (action === 'markSharboxRead') return createJsonResponse(markSharboxItemAsRead(body.id));

    // NEW: saveNote
    if (action === 'saveNote') return createJsonResponse(saveNoteToRegistry(body.item, body.content));
    // NEW: deleteNote
    if (action === 'deleteNote') return createJsonResponse(deleteNoteFromRegistry(body.id));

    // NEW: saveTracerProject
    if (action === 'saveTracerProject') return createJsonResponse(saveTracerProjectToRegistry(body.item));
    // NEW: deleteTracerProject
    if (action === 'deleteTracerProject') return createJsonResponse(deleteTracerProjectFromRegistry(body.id));
    // NEW: saveTracerLog
    if (action === 'saveTracerLog') return createJsonResponse(saveTracerLogToRegistry(body.item, body.content));
    // NEW: deleteTracerLog
    if (action === 'deleteTracerLog') return createJsonResponse(deleteTracerLogFromRegistry(body.id));
    // NEW: linkTracerReference
    if (action === 'linkTracerReference') return createJsonResponse(linkTracerReferenceToRegistry(body.item));
    // NEW: unlinkTracerReference
    if (action === 'unlinkTracerReference') return createJsonResponse(unlinkTracerReferenceFromRegistry(body.id));
    // NEW: saveReferenceContent
    if (action === 'saveReferenceContent') return createJsonResponse(saveReferenceContentToRegistry(body.item, body.content));
    
    // NEW: Tracer Todo
    if (action === 'saveTracerTodo') return createJsonResponse(saveTracerTodoToRegistry(body.item));
    if (action === 'deleteTracerTodo') return createJsonResponse(deleteTracerTodoFromRegistry(body.id));

    // NEW: Tracer Finance
    if (action === 'saveTracerFinance') return createJsonResponse(saveTracerFinanceToRegistry(body.item, body.content));
    if (action === 'deleteTracerFinance') return createJsonResponse(deleteTracerFinanceFromRegistry(body.id));

    // NEW: aiTracerProxy
    if (action === 'aiTracerProxy') {
      const { subAction, payload } = body;
      if (subAction === 'extractQuote') return createJsonResponse(handleAiTracerQuoteExtraction(payload));
      if (subAction === 'enhanceQuote') return createJsonResponse(handleAiTracerQuoteEnhancement(payload));
    }

    // NEW: saveReview
    if (action === 'saveReview') return createJsonResponse(saveReviewToRegistry(body.item, body.content));
    // NEW: deleteReview
    if (action === 'deleteReview') return createJsonResponse(deleteReviewFromRegistry(body.id));
    // NEW: aiReviewProxy
    if (action === 'aiReviewProxy') return createJsonResponse(handleAiReviewRequest(body.subAction, body.payload));
    
    // ACTION: translateReviewRow (Refined with Error Catching)
    if (action === 'translateReviewRow') {
      try {
        const { text, targetLang } = body;
        const result = fetchTranslation(text, targetLang);
        return createJsonResponse({ status: 'success', translated: result });
      } catch (tErr) {
        return createJsonResponse({ status: 'error', message: "Translation failed: " + tErr.toString() });
      }
    }

    // NEW ACTION: saveConsultation
    if (action === 'saveConsultation') {
      return createJsonResponse(saveConsultationToRegistry(body.item, body.answerContent));
    }
    // NEW ACTION: deleteConsultation
    if (action === 'deleteConsultation') {
      return createJsonResponse(deleteConsultationFromRegistry(body.id));
    }
    // NEW ACTION: aiConsultProxy
    if (action === 'aiConsultProxy') {
      return createJsonResponse(handleAiConsultRequest(body.collectionId, body.question));
    }

    // NEW ACTION: saveColleague
    if (action === 'saveColleague') {
      return createJsonResponse(saveColleagueToRegistry(body.item));
    }
    // NEW ACTION: deleteColleague
    if (action === 'deleteColleague') {
      return createJsonResponse(deleteColleagueFromRegistry(body.id));
    }

    // NEW ACTION: saveTeaching
    if (action === 'saveTeaching') {
      return createJsonResponse(saveTeachingToRegistry(body.item));
    }
    // NEW ACTION: deleteTeaching
    if (action === 'deleteTeaching') {
      return createJsonResponse(deleteTeachingFromRegistry(body.id));
    }

    // NEW ACTION: saveProfile
    if (action === 'saveProfile') {
      return createJsonResponse(saveProfileToRegistry(body.item));
    }

    // NEW ACTION: saveEducation
    if (action === 'saveEducation') {
      return createJsonResponse(saveEducationToRegistry(body.item));
    }
    // NEW ACTION: deleteEducation
    if (action === 'deleteEducation') {
      return createJsonResponse(deleteEducationFromRegistry(body.id));
    }

    // NEW ACTION: saveCareer
    if (action === 'saveCareer') {
      return createJsonResponse(saveCareerToRegistry(body.item));
    }
    // NEW ACTION: deleteCareer
    if (action === 'deleteCareer') {
      return createJsonResponse(deleteCareerFromRegistry(body.id));
    }

    // NEW ACTION: savePublication
    if (action === 'savePublication') {
      return createJsonResponse(savePublicationToRegistry(body.item));
    }
    // NEW ACTION: deletePublication
    if (action === 'deletePublication') {
      return createJsonResponse(deletePublicationFromRegistry(body.id));
    }

    // NEW ACTION: saveActivity
    if (action === 'saveActivity') {
      return createJsonResponse(saveActivityToRegistry(body.item));
    }
    // NEW ACTION: deleteActivity
    if (action === 'deleteActivity') {
      return createJsonResponse(deleteActivityFromRegistry(body.id));
    }

    // NEW ACTION: deleteCV
    if (action === 'deleteCV') {
      return createJsonResponse(deleteCVFromRegistry(body.id));
    }

    // NEW ACTION: generateCV_PDF
    if (action === 'generateCV_PDF') {
      return createJsonResponse(handleGenerateCV_PDF(body.config));
    }

    // NEW ACTION: saveArchivedArticle
    if (action === 'saveArchivedArticle') {
      return createJsonResponse(saveArchivedArticleToRegistry(body.item));
    }
    // NEW ACTION: deleteArchivedArticle
    if (action === 'deleteArchivedArticle') {
      return createJsonResponse(deleteArchivedArticleFromRegistry(body.id));
    }
    // NEW ACTION: toggleFavoriteArticle
    if (action === 'toggleFavoriteArticle') {
      return createJsonResponse(toggleFavoriteArticleInRegistry(body.id, body.status));
    }

    // NEW ACTION: saveArchivedBook
    if (action === 'saveArchivedBook') {
      return createJsonResponse(saveArchivedBookToRegistry(body.item));
    }
    // NEW ACTION: deleteArchivedBook
    if (action === 'deleteArchivedBook') {
      return createJsonResponse(deleteArchivedBookFromRegistry(body.id));
    }
    // NEW ACTION: toggleFavoriteBook
    if (action === 'toggleFavoriteBook') {
      return createJsonResponse(toggleFavoriteBookInRegistry(body.id, body.status));
    }

    // NEW ACTION: saveBrainstorming
    if (action === 'saveBrainstorming') {
      return createJsonResponse(saveBrainstormingToRegistry(body.item));
    }

    // NEW ACTION: deleteBrainstorming
    if (action === 'deleteBrainstorming') {
      return createJsonResponse(deleteBrainstormingFromRegistry(body.id));
    }

    // NEW ACTION: saveResearchProject
    if (action === 'saveResearchProject') {
      return createJsonResponse(saveResearchProjectToRegistry(body.project));
    }

    // NEW ACTION: deleteResearchProject
    if (action === 'deleteResearchProject') {
      return createJsonResponse(deleteResearchProjectFromRegistry(body.id));
    }

    // NEW ACTION: saveProjectSource
    if (action === 'saveProjectSource') {
      return createJsonResponse(saveProjectSourceToRegistry(body.source));
    }

    // NEW ACTION: deleteProjectSource
    if (action === 'deleteProjectSource') {
      return createJsonResponse(deleteProjectSourceFromRegistry(body.id));
    }

    // NEW ACTION: translateResearchSource
    if (action === 'translateResearchSource') {
      const { findings, methodology, limitations, targetLang } = body;
      const tFindings = fetchTranslation(findings, targetLang);
      const tMethod = fetchTranslation(methodology, targetLang);
      const tLimits = fetchTranslation(limitations, targetLang);
      return createJsonResponse({ 
        status: 'success', 
        findings: tFindings, 
        methodology: tMethod, 
        limitations: tLimits 
      });
    }

    // NEW ACTION: getHybridSnippet (Research Context)
    if (action === 'getHybridSnippet') {
      const { fileId, nodeUrl } = body;
      const snippet = getHybridSnippet(fileId, nodeUrl);
      return createJsonResponse({ status: 'success', snippet: snippet });
    }

    // NEW ACTION: saveGapLog (Persistence for Research Analysis)
    if (action === 'saveGapLog') {
      return createJsonResponse(saveGapLog(body.log));
    }

    // NEW ACTION: generateCitations
    if (action === 'generateCitations') {
      const { item, style, language } = body;
      const result = formatCitations(item, style, language);
      return createJsonResponse({ status: 'success', data: result });
    }

    // NEW ACTION: generateInsight (AI Insighter)
    if (action === 'generateInsight') {
      return createJsonResponse(handleGenerateInsight(body.item));
    }

    // NEW ACTION: savePresentation (Conversion + Registry)
    if (action === 'savePresentation') {
      return createJsonResponse(handleSavePresentation(body));
    }

    // NEW ACTION: deletePresentation
    if (action === 'deletePresentation') {
      return createJsonResponse(deletePresentationRecord(body.id));
    }

    // NEW ACTION: generateQuestionsAI
    if (action === 'generateQuestionsAI') {
      return createJsonResponse(handleGenerateQuestions(body));
    }

    // NEW ACTION: saveQuestion
    if (action === 'saveQuestion') {
      return createJsonResponse(saveQuestionToRegistry(body.item));
    }

    // NEW ACTION: deleteQuestionRecord
    if (action === 'deleteQuestionRecord') {
      return createJsonResponse(deleteQuestionFromRegistry(body.id));
    }

    // NEW ACTION: translateInsightSection (TRANSLATION + TOTAL REWRITE)
    if (action === 'translateInsightSection') {
      const { fileId, sectionName, targetLang, nodeUrl } = body;
      if (!fileId) throw new Error("Missing fileId");

      const myUrl = ScriptApp.getService().getUrl();
      const isLocal = !nodeUrl || nodeUrl === "" || nodeUrl === myUrl;
      let insightJson;

      // 1. Ambil data JSON asli
      if (isLocal) {
        insightJson = JSON.parse(DriveApp.getFileById(fileId).getBlob().getDataAsString());
      } else {
        const remoteRes = UrlFetchApp.fetch(nodeUrl + (nodeUrl.indexOf('?') === -1 ? '?' : '&') + "action=getFileContent&fileId=" + fileId);
        insightJson = JSON.parse(JSON.parse(remoteRes.getContentText()).content);
      }

      // 2. Terjemahkan bagian spesifik
      const originalText = insightJson[sectionName];
      if (!originalText) throw new Error("Section text is empty");
      
      const translatedText = fetchTranslation(originalText, targetLang);
      insightJson[sectionName] = translatedText;

      // 3. Simpan balik (Total Rewrite)
      const newContent = JSON.stringify(insightJson);
      if (isLocal) {
        DriveApp.getFileById(fileId).setContent(newContent);
      } else {
        UrlFetchApp.fetch(nodeUrl, {
          method: 'post',
          contentType: 'application/json',
          payload: JSON.stringify({ action: 'saveJsonFile', fileId: fileId, content: newContent })
        });
      }

      return createJsonResponse({ status: 'success', translatedText: translatedText });
    }

    // NEW ACTION: vaultFileUpload (Dynamic Sharding for Activity Vault)
    if (action === 'vaultFileUpload') {
      const threshold = CONFIG.STORAGE.THRESHOLD;
      const target = getViableStorageTarget(threshold);
      if (!target) return createJsonResponse({ status: 'error', message: 'Storage critical threshold reached.' });

      let fileId;
      if (target.isLocal) {
        const folder = DriveApp.getFolderById(target.folderId);
        const blob = Utilities.newBlob(Utilities.base64Decode(body.fileData), body.mimeType, body.fileName);
        fileId = folder.createFile(blob).getId();
      } else {
        const res = UrlFetchApp.fetch(target.url, {
          method: 'post',
          contentType: 'application/json',
          payload: JSON.stringify({ 
            action: 'saveFileDirect', 
            fileName: body.fileName, 
            mimeType: body.mimeType, 
            fileData: body.fileData, 
            folderId: target.folderId 
          }),
          muteHttpExceptions: true
        });
        const resJson = JSON.parse(res.getContentText());
        if (resJson.status === 'success') fileId = resJson.fileId;
        else throw new Error(resJson.message);
      }
      return createJsonResponse({ status: 'success', fileId: fileId, nodeUrl: target.url });
    }

    // ACTION: checkQuota (POST support for Master-Slave communication)
    if (action === 'checkQuota') {
      const quota = Drive.About.get({fields: 'storageQuota'}).storageQuota;
      const remaining = parseInt(quota.limit) - parseInt(quota.usage);
      return createJsonResponse({ status: 'success', remaining: remaining });
    }

    // ACTION: saveJsonFile (ID-AWARE OVERWRITE SUPPORT)
    if (action === 'saveJsonFile') {
      let file;
      if (body.fileId) {
        // TOTAL REWRITE LOGIC
        file = DriveApp.getFileById(body.fileId);
        file.setContent(body.content);
      } else {
        // INITIAL CREATION LOGIC
        const folderId = body.folderId || CONFIG.FOLDERS.MAIN_LIBRARY;
        const folder = DriveApp.getFolderById(folderId);
        const blob = Utilities.newBlob(body.content, 'application/json', body.fileName);
        file = folder.createFile(blob);
      }
      return createJsonResponse({ status: 'success', fileId: file.getId() });
    }

    // ACTION: saveFileDirect
    if (action === 'saveFileDirect') {
      const folderId = body.folderId || CONFIG.FOLDERS.MAIN_LIBRARY;
      const folder = DriveApp.getFolderById(folderId);
      const blob = Utilities.newBlob(Utilities.base64Decode(body.fileData), body.mimeType, body.fileName);
      const file = folder.createFile(blob);
      return createJsonResponse({ status: 'success', fileId: file.getId() });
    }

    // ACTION: deleteRemoteFiles (Support for Sharding Deletion)
    if (action === 'deleteRemoteFiles') {
      const fileIds = body.fileIds || [];
      fileIds.forEach(id => {
        if (id) permanentlyDeleteFile(id);
      });
      return createJsonResponse({ status: 'success' });
    }
    
    if (action === 'saveItem') {
      const item = body.item;
      // SYSTEM ASSET GUARD: Avoid sharding/AI for internal assets
      const isSystemAsset = (String(item.id).toUpperCase() === 'PHOTO_PROFILE');
      
      // FINAL SANITIZATION: Decoding HTML Entities before saving to Sheet
      if (item.title) item.title = decodeHtmlEntities(item.title);
      if (item.publisher) item.publisher = decodeHtmlEntities(item.publisher);
      if (item.journalName) item.journalName = decodeHtmlEntities(item.journalName);
      if (Array.isArray(item.authors)) {
        item.authors = item.authors.map(a => decodeHtmlEntities(a));
      }

      const extractedText = body.extractedText || "";
      const isFileUpload = (body.file && body.file.fileData);

      // --- SELF-HEALING MECHANISM: Supporting References (Atomic Protection) ---
      // If references are missing but keywords exist, attempt a final server-side enrichment
      if (!item.supportingReferences || (Array.isArray(item.supportingReferences.references) && item.supportingReferences.references.length === 0)) {
         const keywords = (item.tags && Array.isArray(item.tags.keywords)) ? item.tags.keywords : [];
         if (keywords.length > 0) {
            try {
               item.supportingReferences = {
                  references: getSupportingReferencesFromOpenAlex(keywords) || [],
                  videoUrl: getYoutubeRecommendation(keywords) || ""
               };
            } catch (healErr) {
               console.warn("Self-healing enrichment failed: " + healErr.toString());
            }
         }
      }
      
      // Determine required threshold based on method
      const threshold = isFileUpload ? CONFIG.STORAGE.THRESHOLD : CONFIG.STORAGE.CRITICAL_THRESHOLD;
      const storageTarget = getViableStorageTarget(threshold);

      // STORAGE GUARD: If no storage (Master or any Slaves) has enough space
      if (!storageTarget) {
        if (isFileUpload) {
          return createJsonResponse({ 
            status: 'error', 
            title: 'REGISTERING FAILED', 
            message: 'Your Storage tidak cukup, daftarkan storage baru atau gunakan metode save link atau identifier' 
          });
        } else {
          return createJsonResponse({ 
            status: 'error', 
            title: 'REGISTERING FAILED', 
            message: 'Your Storage is critical (below 2GB). Please register a new storage node to continue.' 
          });
        }
      }

      item.storageNodeUrl = storageTarget.url;

      // 1. SHARDING: Extracted Content JSON - SKIP IF SYSTEM ASSET
      if (extractedText && !isSystemAsset) {
        const jsonFileName = `extracted_${item.id}.json`;
        const jsonContent = JSON.stringify({ id: item.id, fullText: extractedText });
        if (storageTarget.isLocal) {
          const folder = DriveApp.getFolderById(storageTarget.folderId);
          const file = folder.createFile(Utilities.newBlob(jsonContent, 'application/json', jsonFileName));
          item.extractedJsonId = file.getId();
        } else {
          const res = UrlFetchApp.fetch(storageTarget.url, {
            method: 'post',
            contentType: 'application/json',
            payload: JSON.stringify({ action: 'saveJsonFile', fileName: jsonFileName, content: jsonContent, folderId: storageTarget.folderId }),
            muteHttpExceptions: true
          });
          const resJson = JSON.parse(res.getContentText());
          if (resJson.status === 'success') item.extractedJsonId = resJson.fileId;
        }
      }

      // 2. SHARDING: Insight Data JSON - SKIP IF SYSTEM ASSET
      if (!item.insightJsonId && !isSystemAsset) {
        const insightFileName = `insight_${item.id}.json`;
        const insightContent = JSON.stringify({});
        if (storageTarget.isLocal) {
          const folder = DriveApp.getFolderById(storageTarget.folderId);
          const file = folder.createFile(Utilities.newBlob(insightContent, 'application/json', insightFileName));
          item.insightJsonId = file.getId();
        } else {
          const res = UrlFetchApp.fetch(storageTarget.url, {
            method: 'post',
            contentType: 'application/json',
            payload: JSON.stringify({ action: 'saveJsonFile', fileName: insightFileName, content: insightContent, folderId: storageTarget.folderId }),
            muteHttpExceptions: true
          });
          const resJson = JSON.parse(res.getContentText());
          if (resJson.status === 'success') item.insightJsonId = resJson.fileId;
        }
      }

      // 3. SHARDING: Original File / Binary Data
      if (body.file && body.file.fileData) {
        const mimeType = body.file.mimeType || 'application/octet-stream';
        if (storageTarget.isLocal) {
          const folder = DriveApp.getFolderById(storageTarget.folderId);
          const blob = Utilities.newBlob(Utilities.base64Decode(body.file.fileData), mimeType, body.file.fileName);
          const file = folder.createFile(blob);
          item.fileId = file.getId();
        } else {
          const res = UrlFetchApp.fetch(storageTarget.url, {
            method: 'post',
            contentType: 'application/json',
            payload: JSON.stringify({ action: 'saveFileDirect', fileName: body.file.fileName, mimeType: mimeType, fileData: body.file.fileData, folderId: storageTarget.folderId }),
            muteHttpExceptions: true
          });
          const resJson = JSON.parse(res.getContentText());
          if (resJson.status === 'success') {
            item.fileId = resJson.fileId;
          }
        }
      }

      if (item.url && (item.url.includes('youtube.com') || item.url.includes('youtu.be'))) {
        const ytid = extractYoutubeId(item.url);
        if (ytid) item.youtubeId = 'https://www.youtube.com/embed/' + ytid;
      }
      
      // Khusus untuk Library Item (Bukan Foto Profil)
      if (!isSystemAsset) {
        saveToSheet(CONFIG.SPREADSHEETS.LIBRARY, "Collections", item);
      }
      
      return createJsonResponse({ 
        status: 'success', 
        fileId: item.fileId, 
        nodeUrl: item.storageNodeUrl,
        extractedJsonId: item.extractedJsonId,
        insightJsonId: item.insightJsonId
      });
    }
    
    if (action === 'deleteItem') {
      deleteFromSheet(CONFIG.SPREADSHEETS.LIBRARY, "Collections", body.id);
      return createJsonResponse({ status: 'success' });
    }
    
    if (action === 'extractOnly') {
      let extractedText = "";
      let fileName = body.fileName || "Extracted Content";
      let imageView = null;
      let detectedMime = null;
      let primaryDoiFromMeta = null;
      
      // Wrap regex variables in a block to avoid identifier duplication errors in Main.gs
      {
        const doiPattern = /10\.\d{4,9}\/[-._;()/:A-Z0-9]{5,}/i;
        const isbnPattern = /ISBN(?:-1[03])?:?\s*((?:97[89][\s-]?)?[0-9]{1,5}[\s-]?[0-9]+[\s-]?[0-9]+[\s-]?[0-9X])/i;
        const issnPattern = /ISSN:?\s*([0-9]{4}-?[0-9]{3}[0-9X])/i;
        const pmidPattern = /PMID:?\s*(\d{4,11})/i;
        const arxivPattern = /arXiv:?\s*(\d{4}\.\d{4,5}(?:v\d+)?)/i;

        let detectedDoi = null;
        let detectedIsbn = null;
        let detectedIssn = null;
        let detectedPmid = null;
        let detectedArxiv = null;

        try {
          if (body.url) {
            // STEP 1: SNIFF URL STRING (Strict checking)
            const urlDoiMatch = body.url.match(doiPattern);
            if (urlDoiMatch) detectedDoi = urlDoiMatch[0];
            
            const urlPmidMatch = body.url.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/i);
            if (urlPmidMatch) detectedPmid = urlPmidMatch[1];

            const urlArxivMatch = body.url.match(/arxiv\.org\/(?:pdf|abs)\/(\d{4}\.\d{4,5})/i);
            if (urlArxivMatch) detectedArxiv = urlArxivMatch[1];

            const driveId = getFileIdFromUrl(body.url);
            if (driveId && (body.url.includes('drive.google.com') || body.url.includes('docs.google.com'))) {
              try {
                const fileMeta = Drive.Files.get(driveId);
                detectedMime = fileMeta.mimeType;
                const isAudioVideo = detectedMime.includes('audio/') || detectedMime.includes('video/');
                if (isAudioVideo) {
                  return createJsonResponse({ status: 'error', message: 'Audio/Video from Drive not supported.' });
                }
                if (detectedMime && detectedMime.toLowerCase().includes('image/')) imageView = 'https://lh3.googleusercontent.com/d/' + driveId;
              } catch (e) {}
            }
            
            extractedText = routerUrlExtraction(body.url);
            const doiMetaMatch = extractedText.match(/PRIMARY_DOI:\s*([^\n]+)/);
            if (doiMetaMatch) primaryDoiFromMeta = doiMetaMatch[1].trim();
          } else if (body.fileData) {
            extractedText = handleFileExtraction(body.fileData, body.mimeType, fileName);
            detectedMime = body.mimeType;
          }
        } catch (err) {
          extractedText = "Extraction failed: " + err.toString();
        }

        const snippet = extractedText.substring(0, 15000);
        
        // STEP 2: Content Scanning (Fallback)
        if (!detectedDoi) detectedDoi = primaryDoiFromMeta || (snippet.match(doiPattern) ? snippet.match(doiPattern)[0] : null);
        if (!detectedIsbn) detectedIsbn = snippet.match(isbnPattern) ? snippet.match(isbnPattern)[1] : null;
        if (!detectedIssn) detectedIssn = snippet.match(issnPattern) ? snippet.match(issnPattern)[1] : null;
        if (!detectedPmid) detectedPmid = snippet.match(pmidPattern) ? snippet.match(pmidPattern)[1] : null;
        if (!detectedArxiv) detectedArxiv = snippet.match(arxivPattern) ? (snippet.match(arxivPattern)[1] || snippet.match(arxivPattern)[0]) : null;

        // DOI CLEANUP
        if (detectedDoi && !primaryDoiFromMeta) {
          detectedDoi = detectedDoi.replace(/[.,;)]+$/, '');
          if (/[0-9][A-Z]{3,}$/.test(detectedDoi)) {
            const cleaned = detectedDoi.replace(/[A-Z]{3,}$/, '');
            if (cleaned.length > 7) detectedDoi = cleaned;
          }
        }

        return createJsonResponse({ 
          status: 'success', 
          extractedText: extractedText,
          fileName: fileName,
          mimeType: detectedMime,
          detectedDoi: detectedDoi,
          detectedIsbn: detectedIsbn,
          detectedIssn: detectedIssn,
          detectedPmid: detectedPmid,
          detectedArxiv: detectedArxiv,
          imageView: imageView
        });
      }
    }

    if (action === 'searchByIdentifier') return createJsonResponse(handleIdentifierSearch(body.idValue));
    
    // MODIFIED: Injeksi parameter responseType ke handleAiRequest
    if (action === 'aiProxy') {
      const { provider, prompt, modelOverride, responseType } = body;
      return createJsonResponse(handleAiRequest(provider, prompt, modelOverride, responseType));
    }
    
    // NEW: fetchImageProxy (Bypass CORS via Server-side fetch)
    if (action === 'fetchImageProxy') {
      try {
        const imgRes = UrlFetchApp.fetch(body.url);
        const blob = imgRes.getBlob();
        const b64 = Utilities.base64Encode(blob.getBytes());
        return createJsonResponse({ status: 'success', data: 'data:' + blob.getContentType() + ';base64,' + b64 });
      } catch (e) {
        return createJsonResponse({ status: 'error', message: e.toString() });
      }
    }

    // UPDATED ACTION: getSupportingReferences (Protected Logic)
    if (action === 'getSupportingReferences') {
      const keywords = body.keywords || [];
      let references = [];
      let videoUrl = "";
      
      try {
        references = getSupportingReferencesFromOpenAlex(keywords);
      } catch (e) { console.error("Ref fetch fail: " + e.toString()); }
      
      try {
        videoUrl = getYoutubeRecommendation(keywords);
      } catch (e) { console.error("YT fetch fail: " + e.toString()); }
      
      return createJsonResponse({
        status: 'success',
        data: {
          references: references,
          videoUrl: videoUrl || ""
        }
      });
    }

    // NEW ACTION: translateBrainstorming
    if (action === 'translateBrainstorming') {
      const { data, targetLang } = body;
      const translated = {};
      const fields = ['proposedTitle', 'problemStatement', 'researchGap', 'researchQuestion', 'methodology', 'population', 'proposedAbstract'];
      
      fields.forEach(field => {
        if (data[field]) {
          translated[field] = fetchTranslation(data[field], targetLang);
        }
      });

      if (data.pillars && Array.isArray(data.pillars)) {
        translated.pillars = data.pillars.map(p => fetchTranslation(p, targetLang));
      }

      return createJsonResponse({ status: 'success', data: translated });
    }

    // MODIFIED ACTION: getBrainstormingRecommendations (Now calls Brainstorming_API module)
    if (action === 'getBrainstormingRecommendations') {
      const { keywords, title } = body;
      return createJsonResponse(getBrainstormingDeepRecommendations(keywords, title));
    }
    
    return createJsonResponse({ status: 'error', message: 'Invalid action: ' + action });
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}