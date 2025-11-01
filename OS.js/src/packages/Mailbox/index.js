import osjs from 'osjs';
import {name as applicationName} from './metadata.json';

const API_BASE_URL = 'https://web-production-02ec.up.railway.app';

const register = (core, args, options, metadata) => {
  const proc = core.make('osjs/application', {
    args,
    options,
    metadata
  });

  const win = proc.createWindow({
    id: 'MailboxWindow',
    title: metadata.title.en_EN,
    dimension: {width: 900, height: 700},
    position: {left: 100, top: 100}
  });

  win.on('destroy', () => proc.destroy());

  win.render(($content, window) => {
    // Container for mailbox UI
    const container = document.createElement('div');
    container.style.cssText = `
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      background: #fff;
      padding: 16px 20px;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      align-items: center;
      justify-content: space-between;
    `;
    
    const title = document.createElement('h2');
    title.textContent = '📧 Inbox';
    title.style.cssText = 'margin: 0; font-size: 18px; font-weight: 600; color: #333;';
    header.appendChild(title);

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'display: flex; gap: 8px;';

    const composeBtn = document.createElement('button');
    composeBtn.textContent = '✏️ Compose';
    composeBtn.style.cssText = `
      padding: 6px 12px;
      background: #34c759;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
    `;
    composeBtn.onmouseover = () => composeBtn.style.background = '#28a745';
    composeBtn.onmouseout = () => composeBtn.style.background = '#34c759';
    buttonContainer.appendChild(composeBtn);

    const refreshBtn = document.createElement('button');
    refreshBtn.textContent = '🔄 Refresh';
    refreshBtn.style.cssText = `
      padding: 6px 12px;
      background: #007aff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
    `;
    refreshBtn.onmouseover = () => refreshBtn.style.background = '#0051d5';
    refreshBtn.onmouseout = () => refreshBtn.style.background = '#007aff';
    buttonContainer.appendChild(refreshBtn);

    header.appendChild(buttonContainer);

    // Content area
    const contentArea = document.createElement('div');
    contentArea.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      background: #f5f5f5;
      position: relative;
    `;

    // Compose modal overlay
    const composeModal = document.createElement('div');
    composeModal.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    `;

    const composeDialog = document.createElement('div');
    composeDialog.style.cssText = `
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      width: 90%;
      max-width: 600px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    `;

    const composeHeader = document.createElement('div');
    composeHeader.style.cssText = `
      padding: 16px 20px;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    const composeTitle = document.createElement('h3');
    composeTitle.textContent = 'Compose Email';
    composeTitle.style.cssText = 'margin: 0; font-size: 18px; font-weight: 600;';
    composeHeader.appendChild(composeTitle);
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: #666;
      padding: 0;
      width: 24px;
      height: 24px;
    `;
    closeBtn.onmouseover = () => closeBtn.style.color = '#000';
    closeBtn.onmouseout = () => closeBtn.style.color = '#666';
    composeHeader.appendChild(closeBtn);

    const composeBody = document.createElement('div');
    composeBody.style.cssText = `
      padding: 20px;
      overflow-y: auto;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 16px;
    `;

    // Instructions input
    const instructionsLabel = document.createElement('label');
    instructionsLabel.textContent = 'Email Instructions:';
    instructionsLabel.style.cssText = 'font-weight: 500; color: #333; font-size: 14px;';
    const instructionsInput = document.createElement('textarea');
    instructionsInput.placeholder = 'e.g., "Email Alex Johnson at zoebex01@gmail.com about the launch. Mention the roadmap deck and ask for feedback by Friday."';
    instructionsInput.style.cssText = `
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      font-family: inherit;
      resize: vertical;
      min-height: 100px;
    `;
    composeBody.appendChild(instructionsLabel);
    composeBody.appendChild(instructionsInput);

    const composeFooter = document.createElement('div');
    composeFooter.style.cssText = `
      padding: 16px 20px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    `;

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
      padding: 8px 16px;
      background: #f0f0f0;
      color: #333;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
    cancelBtn.onmouseover = () => cancelBtn.style.background = '#e0e0e0';
    cancelBtn.onmouseout = () => cancelBtn.style.background = '#f0f0f0';

    const sendBtn = document.createElement('button');
    sendBtn.textContent = '📤 Send';
    sendBtn.style.cssText = `
      padding: 8px 16px;
      background: #007aff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
    sendBtn.onmouseover = () => sendBtn.style.background = '#0051d5';
    sendBtn.onmouseout = () => sendBtn.style.background = '#007aff';

    let sending = false;
    sendBtn.addEventListener('click', async () => {
      const instructions = instructionsInput.value.trim();
      if (!instructions) {
        alert('Please enter email instructions');
        return;
      }

      if (sending) return;
      sending = true;
      sendBtn.textContent = 'Sending...';
      sendBtn.disabled = true;

      try {
        const response = await fetch(`${API_BASE_URL}/compose-send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ instructions })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.status === 'sent' || result.email) {
          alert('Email sent successfully!');
          composeModal.style.display = 'none';
          instructionsInput.value = '';
          // Refresh inbox
          fetchEmail();
        } else {
          throw new Error('Email sending failed');
        }
      } catch (error) {
        console.error('Error sending email:', error);
        alert(`Error sending email: ${error.message}`);
      } finally {
        sending = false;
        sendBtn.textContent = '📤 Send';
        sendBtn.disabled = false;
      }
    });

    composeFooter.appendChild(cancelBtn);
    composeFooter.appendChild(sendBtn);

    composeDialog.appendChild(composeHeader);
    composeDialog.appendChild(composeBody);
    composeDialog.appendChild(composeFooter);
    composeModal.appendChild(composeDialog);
    contentArea.appendChild(composeModal);

    const closeModal = () => {
      composeModal.style.display = 'none';
      instructionsInput.value = '';
    };

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    composeModal.addEventListener('click', (e) => {
      if (e.target === composeModal) closeModal();
    });

    composeBtn.addEventListener('click', () => {
      composeModal.style.display = 'flex';
      instructionsInput.focus();
    });

    // Loading state
    const loadingDiv = document.createElement('div');
    loadingDiv.style.cssText = `
      text-align: center;
      padding: 40px;
      color: #666;
    `;
    loadingDiv.textContent = 'Loading email...';
    contentArea.appendChild(loadingDiv);

    // Empty state
    const emptyDiv = document.createElement('div');
    emptyDiv.style.cssText = `
      text-align: center;
      padding: 60px 20px;
      color: #999;
      display: none;
    `;
    emptyDiv.innerHTML = `
      <div style="font-size: 48px; margin-bottom: 16px;">📭</div>
      <div style="font-size: 16px;">No emails found</div>
    `;
    contentArea.appendChild(emptyDiv);

    // Email card container
    const emailContainer = document.createElement('div');
    emailContainer.style.cssText = 'display: none;';
    contentArea.appendChild(emailContainer);

    // Function to format date
    const formatDate = (dateString) => {
      if (!dateString) return 'Unknown date';
      try {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch (e) {
        return dateString;
      }
    };

    // Function to fetch and display email
    const fetchEmail = async () => {
      loadingDiv.style.display = 'block';
      emptyDiv.style.display = 'none';
      emailContainer.style.display = 'none';
      emailContainer.innerHTML = '';

      try {
        const response = await fetch(`${API_BASE_URL}/latest-email`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        loadingDiv.style.display = 'none';

        if (!data || (!data.email && !data.body)) {
          emptyDiv.style.display = 'block';
          return;
        }

        // Handle both response formats
        const email = data.email || data;
        
        if (!email.subject && !email.body) {
          emptyDiv.style.display = 'block';
          return;
        }

        emailContainer.style.display = 'block';

        // Email card
        const emailCard = document.createElement('div');
        emailCard.style.cssText = `
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          padding: 24px;
          margin-bottom: 16px;
        `;

        // Header section
        const emailHeader = document.createElement('div');
        emailHeader.style.cssText = `
          border-bottom: 1px solid #e0e0e0;
          padding-bottom: 16px;
          margin-bottom: 16px;
        `;

        const subject = document.createElement('div');
        subject.textContent = email.subject || 'No Subject';
        subject.style.cssText = `
          font-size: 20px;
          font-weight: 600;
          color: #333;
          margin-bottom: 12px;
        `;

        const fromLine = document.createElement('div');
        fromLine.style.cssText = `
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        `;

        const fromLabel = document.createElement('span');
        fromLabel.style.cssText = 'color: #666; font-size: 14px; margin-right: 8px;';
        fromLabel.textContent = 'From:';

        const fromValue = document.createElement('span');
        fromValue.style.cssText = 'color: #333; font-size: 14px; font-weight: 500;';
        fromValue.textContent = email.from || email.to || 'Unknown sender';

        fromLine.appendChild(fromLabel);
        fromLine.appendChild(fromValue);

        const toLine = document.createElement('div');
        toLine.style.cssText = `
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        `;

        const toLabel = document.createElement('span');
        toLabel.style.cssText = 'color: #666; font-size: 14px; margin-right: 8px;';
        toLabel.textContent = 'To:';

        const toValue = document.createElement('span');
        toValue.style.cssText = 'color: #333; font-size: 14px;';
        toValue.textContent = email.to || 'Unknown recipient';

        toLine.appendChild(toLabel);
        toLine.appendChild(toValue);

        const dateLine = document.createElement('div');
        dateLine.style.cssText = 'color: #999; font-size: 12px; margin-top: 8px;';
        dateLine.textContent = formatDate(email.date || email.timestamp || new Date().toISOString());

        emailHeader.appendChild(subject);
        emailHeader.appendChild(fromLine);
        emailHeader.appendChild(toLine);
        emailHeader.appendChild(dateLine);

        // Body section
        const emailBody = document.createElement('div');
        emailBody.style.cssText = `
          color: #333;
          font-size: 14px;
          line-height: 1.6;
          white-space: pre-wrap;
          word-wrap: break-word;
        `;
        emailBody.textContent = email.body || 'No content';

        emailCard.appendChild(emailHeader);
        emailCard.appendChild(emailBody);
        emailContainer.appendChild(emailCard);

      } catch (error) {
        console.error('Error fetching email:', error);
        loadingDiv.style.display = 'none';
        
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
          text-align: center;
          padding: 40px;
          color: #d32f2f;
        `;
        errorDiv.innerHTML = `
          <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
          <div style="font-size: 16px; margin-bottom: 8px;">Error loading email</div>
          <div style="font-size: 12px; color: #666;">${error.message}</div>
        `;
        contentArea.appendChild(errorDiv);
      }
    };

    // Refresh button handler
    refreshBtn.addEventListener('click', fetchEmail);

    // Initial load
    fetchEmail();

    container.appendChild(header);
    container.appendChild(contentArea);
    $content.appendChild(container);
  });

  return proc;
};

osjs.register(applicationName, register);
