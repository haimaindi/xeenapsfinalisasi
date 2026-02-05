/**
 * XEENAPS PKM - GLOBAL CONFIGURATION
 */
const CONFIG = {
  FOLDERS: {
    MAIN_LIBRARY: '1CUvptRGnncn0M-vZdLCb1XBUmAeM9G8B'
  },
  STORAGE: {
    THRESHOLD: 5 * 1024 * 1024 * 1024, // 5 GB in bytes
    CRITICAL_THRESHOLD: 2 * 1024 * 1024 * 1024, // 2 GB for Link/Ref
    REGISTRY_SHEET: 'StorageNodes'
  },
  SPREADSHEETS: {
    LIBRARY: '1ROW4iyHN10DfDWaXL7O54mZi6Da9Xx70vU6oE-YW-I8',
    KEYS: '1Ji8XL2ceTprNa1dYvhfTnMDkWwzC937kpfyP19D7NvI',
    AI_CONFIG: '1RVYM2-U5LRb8S8JElRSEv2ICHdlOp9pnulcAM8Nd44s',
    STORAGE_REGISTRY: '1qBzgjhUv_aAFh5cLb8SqIt83bOdUFRfRXZz4TxyEZDw',
    PRESENTATION: '1Sfng6xCz2d4NAmBZFgyjZ9Fy8X1k149c7ohXS9uO2r8',
    QUESTION_BANK: '14ZbesZJvLLr3d1rhTW_L4E_D6gqWj_e7AJIiLJ2b5OU',
    RESEARCH: '1XRmeIuj2vyXO9a0BFwODdkMNd_o7bmPIw9KHQOtFhoE',
    BRAINSTORMING: '1nMC1fO5kLdzO4W9O_sPK2tfL1K_GGQ-lE7g2Un76OrM',
    LITERATURE_ARCHIVE: '1cJxS3gIYW3-WIgLs5L0mW6LKj4yAlh8kk0wJJ7nFmpE',
    BOOK_ARCHIVE: '1cJxS3gIYW3-WIgLs5L0mW6LKj4yAlh8kk0wJJ7nFmpE', // Shared or separate ID
    PUBLICATION: '1logOZHQgiMW4fOAViF_fYbjL0mG9RetqKDAAzAmiQ3g',
    ACTIVITIES: '1IQ8dzXKfVuAtSnXsU5Wx2JGa5Wkmw_R38HbvH1tXTRU',
    TEACHING: '18630rhA5D_JDuCMcQ5XT3pVii1VYAhC7ixUnTcN8gHU',
    PROFILE: '1aGnFF7Tr8nnq69Qk6EjJXZb6yJb-OJBMZkOPZpBOexo',
    CV_REGISTRY: '1w_-GyH_gTansPBt_6tSR9twcAV0tQi4dan9rUfKdyKw',
    COLLEAGUES: '1GDSVHc2-IuvMs7-GqopfYu2L8UZKRH5-I_a1GbDL9UA',
    CONSULTATION: '1tWeM09na8DY0pjU5wwnLNvzl_BIK6pB90m2WToF98Ts',
    NOTEBOOK: '1LxDILaoTFkHV9ZRx67YUhLQmHANeySdvR8AcYO8NMQs',
    LITERATURE_REVIEW: '1l8P-jSZsj6Q6OuBjPDpM3nCNpDcxeoreYebhr0RMz_Y',
    TRACER: '1TKp9891UDP5dgH94PtgZmiDeEh0fNCuaOyic1v5GlOE',
    SHARBOX: '17oCBcTIkdq4zqY0RtlzgiFR2dk9vzq1wLZhQ2tiQTqc'
  },
  SCHEMAS: {
    LIBRARY: [
      'id', 'title', 'type', 'category', 'topic', 'subTopic', 'authors', 'publisher', 'year', 'fullDate', 'pubInfo', 'identifiers', 'source', 'format', 'url', 'fileId', 'imageView', 'youtubeId', 'tags', 'abstract', 'mainInfo', 'extractedJsonId', 'insightJsonId', 'storageNodeUrl', 'isFavorite', 'isBookmarked', 'createdAt', 'updatedAt', 'supportingReferences'
    ],
    SHARBOX_INBOX: [
      'id', 'senderName', 'senderPhotoUrl', 'senderAffiliation', 'senderUniqueAppId', 'senderEmail', 'senderPhone', 'senderSocialMedia', 'message', 'timestamp', 'status', 'isRead',
      'id_item', 'title', 'type', 'category', 'topic', 'subTopic', 'authors', 'publisher', 'year', 'fullDate', 'pubInfo', 'identifiers', 'source', 'format', 'url', 'fileId', 'imageView', 'youtubeId', 'tags', 'abstract', 'mainInfo', 'extractedJsonId', 'insightJsonId', 'storageNodeUrl', 'isFavorite', 'isBookmarked', 'createdAt', 'updatedAt', 'supportingReferences'
    ],
    SHARBOX_SENT: [
      'id', 'receiverName', 'receiverPhotoUrl', 'receiverUniqueAppId', 'receiverEmail', 'receiverPhone', 'receiverSocialMedia', 'message', 'timestamp', 'status',
      'id_item', 'title', 'type', 'category', 'topic', 'subTopic', 'authors', 'publisher', 'year', 'fullDate', 'pubInfo', 'identifiers', 'source', 'format', 'url', 'fileId', 'imageView', 'youtubeId', 'tags', 'abstract', 'mainInfo', 'extractedJsonId', 'insightJsonId', 'storageNodeUrl', 'isFavorite', 'isBookmarked', 'createdAt', 'updatedAt', 'supportingReferences'
    ],
    NOTEBOOK: [
      'id', 'collectionId', 'collectionTitle', 'label', 'searchIndex', 'noteJsonId', 'storageNodeUrl', 'isFavorite', 'isUsed', 'createdAt', 'updatedAt'
    ],
    TEACHING: [
      'id', 'label', 'teachingDate', 'startTime', 'endTime', 'institution', 'faculty', 'program', 'academicYear', 'semester', 'classGroup', 'meetingNo', 'mode', 'plannedStudents', 'location', 'eventColor', 'skReference',
      'courseTitle', 'courseCode', 'learningOutcomes', 'method', 'theoryCredits', 'practicalCredits', 'courseType', 'educationLevel', 'topic', 'role', 'referenceLinks', 'presentationId', 'questionBankId', 'attachmentLink', 'syllabusLink', 'lectureNotesLink',
      'actualStartTime', 'actualEndTime', 'teachingDuration', 'totalStudentsPresent', 'attendancePercentage', 'attendanceListLink', 'problems', 'reflection', 'assignmentType', 'assessmentCriteria',
      'vaultJsonId', 'storageNodeUrl', 'status', 'createdAt', 'updatedAt'
    ],
    PRESENTATIONS: [
      'id', 'collectionIds', 'gSlidesId', 'title', 'presenters', 'templateName', 'themeConfig', 'slidesCount', 'storageNodeUrl', 'createdAt', 'updatedAt'
    ],
    QUESTIONS: [
      'id', 'collectionId', 'bloomLevel', 'customLabel', 'questionText', 'options', 'correctAnswer', 'reasoningCorrect', 'reasoningDistractors', 'verbatimReference', 'language', 'createdAt'
    ],
    RESEARCH_PROJECTS: [
      'id', 'projectName', 'language', 'status', 'isFavorite', 'isUsed', 'proposedTitle', 'noveltyNarrative', 'futureDirections', 'createdAt', 'updatedAt'
    ],
    PROJECT_SOURCES: [
      'id', 'projectId', 'sourceId', 'title', 'findings', 'methodology', 'limitations', 'createdAt', 'isFavorite', 'isUsed'
    ],
    BRAINSTORMING: [
      'id', 'label', 'roughIdea', 'proposedTitle', 'problemStatement', 'researchGap', 'researchQuestion', 'methodology', 'population', 'keywords', 'pillars', 'proposedAbstract', 'externalRefs', 'internalRefs', 'isFavorite', 'isUsed', 'createdAt', 'updatedAt'
    ],
    ARCHIVED_ARTICLES: [
      'id', 'title', 'citationHarvard', 'doi', 'url', 'info', 'label', 'isFavorite', 'createdAt'
    ],
    ARCHIVED_BOOKS: [
      'id', 'title', 'citationHarvard', 'isbn', 'url', 'info', 'label', 'isFavorite', 'createdAt'
    ],
    PUBLICATION: [
      'id', 'title', 'authors', 'type', 'status', 'publisherName', 'researchDomain', 'affiliation', 'indexing', 'quartile', 'doi', 'issn_isbn', 'volume', 'issue', 'pages', 'year', 'submissionDate', 'acceptanceDate', 'publicationDate', 'brainstormingId', 'libraryId', 'manuscriptLink', 'abstract', 'keywords', 'remarks', 'isFavorite', 'createdAt', 'updatedAt'
    ],
    ACTIVITIES: [
      'id', 'type', 'eventName', 'organizer', 'location', 'level', 'startDate', 'endDate', 'role', 'description', 'notes', 'certificateNumber', 'credit', 'link', 'isFavorite', 'vaultJsonId', 'storageNodeUrl', 'createdAt', 'updatedAt', 'certificateFileId', 'certificateNodeUrl'
    ],
    PROFILE: [
      'fullName', 'photoUrl', 'photoFileId', 'photoNodeUrl', 'birthDate', 'address', 'email', 'phone', 'sintaId', 'scopusId', 'wosId', 'googleScholarId', 'jobTitle', 'affiliation', 'uniqueAppId', 'socialMedia'
    ],
    EDUCATION: [
      'id', 'level', 'institution', 'major', 'degree', 'startYear', 'endYear'
    ],
    CAREER: [
      'id', 'company', 'position', 'type', 'startDate', 'endDate', 'location', 'description'
    ],
    CV_REGISTRY: [
      'id', 'title', 'template', 'fileId', 'storageNodeUrl', 'selectedEducationIds', 'selectedCareerIds', 'selectedPublicationIds', 'selectedActivityIds', 'includePhoto', 'aiSummary', 'createdAt', 'updatedAt'
    ],
    COLLEAGUES: [
      'id', 'name', 'affiliation', 'uniqueAppId', 'email', 'phone', 'socialMedia', 'photoUrl', 'photoFileId', 'photoNodeUrl', 'isFavorite', 'createdAt', 'updatedAt'
    ],
    CONSULTATIONS: [
      'id', 'collectionId', 'question', 'answerJsonId', 'nodeUrl', 'isFavorite', 'createdAt', 'updatedAt'
    ],
    LITERATURE_REVIEW: [
      'id', 'label', 'centralQuestion', 'reviewJsonId', 'storageNodeUrl', 'isFavorite', 'createdAt', 'updatedAt'
    ],
    TRACER_PROJECTS: [
      'id', 'title', 'label', 'topic', 'problemStatement', 'researchGap', 'researchQuestion', 'methodology', 'population', 'keywords', 'category', 'authors', 'startDate', 'estEndDate', 'status', 'progress', 'createdAt', 'updatedAt'
    ],
    TRACER_LOGS: [
      'id', 'projectId', 'date', 'title', 'logJsonId', 'storageNodeUrl', 'createdAt', 'updatedAt'
    ],
    TRACER_REFERENCES: [
      'id', 'projectId', 'collectionId', 'contentJsonId', 'storageNodeUrl', 'createdAt'
    ],
    TRACER_TODOS: [
      'id', 'projectId', 'title', 'description', 'startDate', 'deadline', 'linkLabel', 'linkUrl', 'isDone', 'completedDate', 'completionRemarks', 'createdAt', 'updatedAt'
    ],
    TRACER_FINANCE: [
      'id', 'projectId', 'date', 'credit', 'debit', 'balance', 'description', 'attachmentsJsonId', 'storageNodeUrl', 'createdAt', 'updatedAt'
    ]
  }
};