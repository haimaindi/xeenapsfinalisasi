/**
 * XEENAPS CV ARCHITECT - HTML-TO-PDF ENGINE V6.3
 * Optimized for speed, reliability, and refined Aesthetics.
 * Fix: Page break prevention and consistent year alignment.
 */

function handleGenerateCV_PDF(config) {
  try {
    const profile = getProfileFromRegistry();
    if (!profile || !profile.fullName) {
      return { status: 'error', message: 'Profile incomplete. Please fill your name in the Profile module first.' };
    }

    const threshold = 100 * 1024 * 1024;
    const storageTarget = getViableStorageTarget(threshold);
    if (!storageTarget) {
      return { status: 'error', message: 'Storage capacity reached. Please register a new storage node.' };
    }

    // 1. IMAGE HARVESTING
    const photoBase64 = profile.photoFileId ? getAsBase64(profile.photoFileId) : null;
    const logoBase64 = getAsBase64("1ZpVAXWGLDP2C42Fct0bisloaQLf2095_"); // Xeenaps Logo Icon ID

    // 2. DATA HARVESTING
    const allEdu = getEducationFromRegistry();
    const allCareer = getCareerFromRegistry();
    const allPubsResult = getPublicationFromRegistry(1, 1000); 
    const allPubs = allPubsResult.items || [];
    const allActsResult = getActivitiesFromRegistry(1, 1000);
    const allActs = allActsResult.items || [];

    const filteredEdu = allEdu.filter(e => config.selectedEducationIds.includes(e.id));
    const filteredCareer = allCareer.filter(c => config.selectedCareerIds.includes(c.id));
    const filteredPubs = allPubs.filter(p => config.selectedPublicationIds.includes(p.id));
    const filteredActs = allActs.filter(a => config.selectedActivityIds.includes(a.id));

    const sortTimeline = (list, startKey, endKey) => {
      return list.sort((a, b) => {
        const getVal = (v) => (v === 'Present' || !v) ? '9999' : String(v);
        return getVal(b[endKey]).localeCompare(getVal(a[endKey])) || getVal(b[startKey]).localeCompare(getVal(a[startKey]));
      });
    };

    const sortedEdu = sortTimeline(filteredEdu, 'startYear', 'endYear');
    const sortedCareer = sortTimeline(filteredCareer, 'startDate', 'endDate');
    const sortedPubs = filteredPubs.sort((a,b) => String(b.year).localeCompare(String(a.year)));
    const sortedActs = filteredActs.sort((a,b) => {
      const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
      const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
      return dateB - dateA;
    });

    // 3. BUILD HTML CONTENT
    const htmlContent = createCVHTML(profile, sortedEdu, sortedCareer, sortedPubs, sortedActs, config.aiSummary, photoBase64, logoBase64);

    // 4. GENERATE PDF BLOB
    const pdfBlob = Utilities.newBlob(htmlContent, 'text/html', 'CV.html').getAs('application/pdf').setName(`${profile.fullName} - CV.pdf`);
    
    // 5. SAVE TO STORAGE TARGET
    let fileId;
    if (storageTarget.isLocal) {
      const folder = DriveApp.getFolderById(storageTarget.folderId);
      const file = folder.createFile(pdfBlob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      fileId = file.getId();
    } else {
      const res = UrlFetchApp.fetch(storageTarget.url, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({ 
          action: 'saveFileDirect', 
          fileName: `${profile.fullName} - CV.pdf`, 
          mimeType: 'application/pdf', 
          fileData: Utilities.base64Encode(pdfBlob.getBytes()), 
          folderId: storageTarget.folderId 
        })
      });
      fileId = JSON.parse(res.getContentText()).fileId;
    }

    const cvDoc = {
      id: Utilities.getUuid(),
      title: config.title,
      template: "Premium Standard",
      fileId: fileId,
      storageNodeUrl: storageTarget.url,
      selectedEducationIds: config.selectedEducationIds,
      selectedCareerIds: config.selectedCareerIds,
      selectedPublicationIds: config.selectedPublicationIds,
      selectedActivityIds: config.selectedActivityIds,
      includePhoto: true,
      aiSummary: config.aiSummary,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    saveCVToRegistry(cvDoc);
    return { status: 'success', data: cvDoc };
  } catch (e) {
    console.error("CV Architect Engine Crash: " + e.toString());
    return { status: 'error', message: 'Document Engine Failed: ' + e.toString() };
  }
}

/**
 * Helper: Drive File to Base64 (Intact)
 */
function getAsBase64(fileId) {
  try {
    const file = DriveApp.getFileById(fileId);
    const blob = file.getBlob();
    const base64 = Utilities.base64Encode(blob.getBytes());
    const mimeType = blob.getContentType();
    return `data:${mimeType};base64,${base64}`;
  } catch (e) {
    return null;
  }
}

/**
 * Format Date Helper (Intact)
 */
function formatDateSafe(dateStr) {
  if (!dateStr || dateStr === 'N/A' || dateStr === 'Unknown' || dateStr === '-') return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      if (/^\d{4}$/.test(String(dateStr).trim())) return dateStr;
      return dateStr;
    }
    const day = d.getDate().toString().padStart(2, '0');
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch (e) {
    return dateStr;
  }
}

/**
 * CORE HTML BUILDER: Xeenaps Premium Style V6.3
 */
function createCVHTML(profile, edu, career, pubs, acts, summary, photoBase64, logoBase64) {
  const navy = "#004A74";
  const yellow = "#FED400";
  const grey = "#4B5563";
  
  const hasData = (list) => Array.isArray(list) && list.length > 0;

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
      @page { size: A4; margin: 1.5cm; }
      body { 
        font-family: 'Inter', sans-serif; 
        line-height: 1.5; 
        color: #1F2937; 
        margin: 0; 
        padding: 0; 
        font-size: 10pt;
      }
      .container { max-width: 800px; margin: 0 auto; }
      
      /* HEADER */
      .header { 
        display: flex; 
        justify-content: space-between; 
        align-items: center; 
        border-bottom: 3px solid ${navy};
        padding-bottom: 20px;
        margin-bottom: 25px;
      }
      .header h1 { 
        margin: 0; 
        color: ${navy}; 
        font-weight: 800; 
        font-size: 28pt; 
        letter-spacing: -1px; 
        text-transform: uppercase;
      }
      .logo img { width: 45px; height: 45px; object-fit: contain; }
      
      /* PROFILE SECTION */
      .profile { 
        display: flex; 
        gap: 35px; 
        align-items: center; 
        margin-bottom: 30px;
      }
      .profile-photo { 
        width: 150px; 
        height: 150px; 
        object-fit: cover; 
        border-radius: 50%; 
        border: 5px solid ${navy};
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        flex-shrink: 0; 
      }
      .profile-info { flex: 1; }
      .profile-info h2 { 
        margin: 0 0 10px 0; 
        color: ${navy}; 
        font-weight: 800; 
        font-size: 18pt; 
        text-transform: uppercase;
      }
      .profile-details { 
        display: grid; 
        grid-template-columns: auto 1fr; 
        gap: 4px 15px; 
        font-size: 9pt; 
      }
      .label { font-weight: 700; color: ${grey}; text-transform: uppercase; font-size: 8pt; letter-spacing: 0.5px; }
      .value { font-weight: 500; color: #374151; }
      
      /* SUMMARY */
      .summary-box {
        background: #F9FAFB;
        padding: 15px 20px;
        border-left: 4px solid ${navy};
        margin-bottom: 30px;
        font-style: italic;
        font-size: 9.5pt;
        color: #374151;
      }

      /* SECTIONS */
      .section { margin-bottom: 25px; }
      .section-title { 
        font-size: 12pt; 
        font-weight: 800; 
        color: ${navy}; 
        margin-bottom: 12px; 
        padding-bottom: 5px; 
        border-bottom: 1.5px solid ${navy};
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      
      /* FIX: Prevent items from splitting across pages */
      .item { 
        margin-bottom: 15px; 
        position: relative; 
        page-break-inside: avoid;
        display: block;
      }
      .item-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px; }
      .item-title { font-weight: 800; font-size: 10.5pt; color: #111827; }
      .item-date { font-weight: 800; font-size: 9pt; color: ${navy}; background: ${yellow}30; padding: 1px 8px; border-radius: 4px; }
      .item-sub { font-weight: 600; font-size: 9.5pt; color: ${grey}; margin-bottom: 4px; }
      .item-desc { font-size: 9pt; color: #4B5563; text-align: justify; line-height: 1.4; }
      
      .separator { margin: 0 8px; color: ${navy}; font-weight: 900; }
      .highlight { font-weight: 800; color: ${navy}; }

      /* FOOTER */
      .footer { 
        margin-top: 40px; 
        text-align: center; 
        font-size: 8pt; 
        color: #9CA3AF; 
        border-top: 1px solid #E5E7EB;
        padding-top: 15px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 2px;
      }
      .footer-brand { color: ${navy}; font-weight: 800; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Curriculum Vitae</h1>
        <div class="logo">
          ${logoBase64 ? `<img src="${logoBase64}">` : ''}
        </div>
      </div>
      
      <div class="profile">
        ${photoBase64 ? `<img src="${photoBase64}" class="profile-photo">` : '<div class="profile-photo" style="background:#eee; display:flex; align-items:center; justify-content:center; color:#ccc;">NO PHOTO</div>'}
        <div class="profile-info">
          <h2>${profile.fullName}</h2>
          <div class="profile-details">
            <div class="label">Position</div><div class="value">${profile.jobTitle || '-'}</div>
            <div class="label">Affiliation</div><div class="value">${profile.affiliation || '-'}</div>
            <div class="label">Birth Date</div><div class="value">${formatDateSafe(profile.birthDate) || '-'}</div>
            <div class="label">Contact</div><div class="value">${[profile.email, profile.phone].filter(Boolean).join(' | ') || '-'}</div>
            <div class="label">Social</div><div class="value">${profile.socialMedia || '-'}</div>
            <div class="label">Location</div><div class="value">${profile.address || '-'}</div>
          </div>
        </div>
      </div>
      
      ${summary ? `<div class="summary-box">${summary}</div>` : ''}
      
      <div class="content">
        ${hasData(edu) ? `
        <div class="section">
          <div class="section-title">Education</div>
          ${edu.map(e => `
            <div class="item">
              <div class="item-header">
                <div class="item-title">${e.institution}</div>
                <div class="item-date">${e.startYear} — ${e.endYear}</div>
              </div>
              <div class="item-sub">${[e.level + " in " + e.major, e.degree].filter(Boolean).join(' <span class="separator">|</span> ')}</div>
            </div>
          `).join('')}
        </div>
        ` : ''}
        
        ${hasData(career) ? `
        <div class="section">
          <div class="section-title">Career Journey</div>
          ${career.map(c => `
            <div class="item">
              <div class="item-header">
                <div class="item-title">${c.position}</div>
                <div class="item-date">${c.startDate} — ${c.endDate}</div>
              </div>
              <div class="item-sub">${[c.company, c.location].filter(Boolean).join(' <span class="separator">|</span> ')}</div>
              ${c.description ? `<div class="item-desc">${c.description}</div>` : ''}
            </div>
          `).join('')}
        </div>
        ` : ''}
        
        ${hasData(pubs) ? `
        <div class="section">
          <div class="section-title">Scientific Publications</div>
          ${pubs.map(p => `
            <div class="item">
              <div class="item-header">
                <div class="item-title">${p.title}</div>
                <div class="item-date">${p.year}</div>
              </div>
              <div class="item-desc">
                ${[p.publisherName, p.researchDomain, p.doi ? 'DOI: ' + p.doi : ''].filter(Boolean).join(' <span class="separator">|</span> ')}
              </div>
            </div>
          `).join('')}
        </div>
        ` : ''}
        
        ${hasData(acts) ? `
        <div class="section">
          <div class="section-title">Academic Activities</div>
          ${acts.map(a => `
            <div class="item">
              <div class="item-header">
                <div class="item-title">${a.eventName}</div>
                <div class="item-date">${new Date(a.startDate).getFullYear()}</div>
              </div>
              <div class="item-desc">
                ${[a.role, a.organizer, a.level + " Level"].filter(Boolean).join(' <span class="separator">|</span> ')}
              </div>
            </div>
          `).join('')}
        </div>
        ` : ''}
      </div>
      
      <div class="footer">
        Generated by <span class="footer-brand">Xeenaps Smart Scholar Ecosystem</span> on ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
      </div>
    </div>
  </body>
  </html>
  `;
}