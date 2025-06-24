document.addEventListener('DOMContentLoaded', () => {
    // --- PRESETS & CONFIG ---
    const backgroundPresets = [
        { id: 'bg1', url: 'https://images.unsplash.com/photo-1553356084-58ef4a67b2a7?q=80&w=1974&auto=format&fit=crop' },
        { id: 'bg2', url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2070&auto=format&fit=crop' },
        { id: 'bg3', url: 'https://images.unsplash.com/photo-1491975474562-1f4e30bc9468?q=80&w=1887&auto=format&fit=crop' },
        { id: 'bg4', url: 'https://images.unsplash.com/photo-1614850523011-8f49ffc73908?q=80&w=2070&auto=format&fit=crop' },
    ];
    const loadingSpinnerHTML = `<div class="loading-spinner"><div class="shape1"></div><div class="shape2"></div><div class="shape3"></div></div>`;
    let userAvatarSVG, aiAvatarSVG;

    // --- ELEMENT HOOKS ---
    const getEl = (id) => document.getElementById(id);
    const settings = {
        apiUrl: getEl('api-url'), apiKey: getEl('api-key'), modelName: getEl('model-name'),
        systemPrompt: getEl('system-prompt'), backgroundUrl: getEl('bg-url-input'),
    };
    const ui = {
        saveBtn: getEl('save-settings'), themeToggleBtn: getEl('theme-toggle'),
        newChatBtn: getEl('new-chat-btn'), sendBtn: getEl('send-button'),
        messageInput: getEl('message-input'), messageContainer: getEl('message-container'),
        menuToggle: getEl('menu-toggle'), sidebar: getEl('sidebar'),
        overlay: getEl('background-overlay'),
        bgPresetsContainer: getEl('bg-presets'),
    };
    let conversationHistory = [];

    // --- AVATAR GENERATOR ---
    function generateAvatar(seed) {
        const S = new Math.seedrandom(seed);
        const colors = ['var(--accent-pink)', 'var(--accent-blue)', 'var(--accent-green)', 'var(--accent-purple)'];
        const rand = (min, max) => S() * (max - min) + min;
        
        const shapeCount = Math.floor(rand(2, 4));
        let shapes = '';
        for (let i = 0; i < shapeCount; i++) {
            const shapeType = ['circle', 'rect'][Math.floor(rand(0, 2))];
            const color = colors[Math.floor(rand(0, colors.length))];
            const size = rand(20, 50);
            const x = rand(0, 100 - size);
            const y = rand(0, 100 - size);
            const rotate = rand(0, 90);
            if (shapeType === 'circle') {
                shapes += `<circle cx="${x + size/2}" cy="${y + size/2}" r="${size/2}" fill="${color}" opacity="0.8"/>`;
            } else {
                shapes += `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${color}" transform="rotate(${rotate} ${x+size/2} ${y+size/2})" opacity="0.8"/>`;
            }
        }
        return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${shapes}</svg>`;
    }
    
    // Simple seedable PRNG
    Math.seedrandom = function(seed) {
        let x = Math.sin(seed) * 10000;
        return function() {
            x = Math.sin(x) * 10000;
            return x - Math.floor(x);
        };
    };

    // --- INITIALIZATION ---
    function initializePresets() {
        populatePresets(ui.bgPresetsContainer, backgroundPresets, (url) => {
            settings.backgroundUrl.value = url;
            updateBackground(url);
            updateSelectedPreset(ui.bgPresetsContainer, url);
        });
    }

    function populatePresets(container, presets, onClick) {
        presets.forEach(preset => {
            const item = document.createElement('div');
            item.className = 'preset-item';
            item.style.backgroundImage = `url(${preset.url})`;
            item.dataset.url = preset.url;
            item.addEventListener('click', () => onClick(preset.url));
            container.appendChild(item);
        });
    }

    // --- CORE FUNCTIONS ---
    const updateBackground = (url) => { if (url) document.body.style.backgroundImage = `url('${url}')`; };
    const updateSelectedPreset = (container, url) => {
        container.querySelectorAll('.preset-item').forEach(item => {
            item.classList.toggle('selected', item.dataset.url === url);
        });
    };

    const loadSettings = () => {
        const theme = localStorage.getItem('theme') || 'dark';
        document.body.setAttribute('data-theme', theme);
        Object.keys(settings).forEach(key => {
            const storageKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            let defaultValue = '';
            if (key === 'modelName') defaultValue = 'gpt-4o';
            if (key === 'systemPrompt') defaultValue = 'You are a helpful and creative assistant.';
            if (key === 'backgroundUrl') defaultValue = backgroundPresets[0].url;
            settings[key].value = localStorage.getItem(storageKey) || defaultValue;
        });
        updateBackground(settings.backgroundUrl.value);
        updateSelectedPreset(ui.bgPresetsContainer, settings.backgroundUrl.value);
    };

    const saveSettings = () => {
        Object.keys(settings).forEach(key => {
            localStorage.setItem(key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`), settings[key].value);
        });
        ui.saveBtn.textContent = '已保存!';
        setTimeout(() => ui.saveBtn.textContent = '保存设置', 2000);
    };
    
    const startNewChat = () => {
        conversationHistory = [];
        ui.messageContainer.innerHTML = '';
        // Generate new avatars for this session
        userAvatarSVG = generateAvatar(Date.now());
        aiAvatarSVG = generateAvatar(Date.now() + 1);
        addMessage('你好！一个全新的对话已经开始。', 'bot');
    };

    const renderContent = (element, text) => {
        const dirtyHtml = marked.parse(text);
        element.innerHTML = DOMPurify.sanitize(dirtyHtml);
        try {
            renderMathInElement(element, { delimiters: [{left: '$$', right: '$$', display: true}, {left: '$', right: '$', display: false}], throwOnError: false });
        } catch (error) { console.error("KaTeX rendering failed:", error); }
    };

    const addMessage = (content, type) => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        const avatar = document.createElement('div');
        avatar.className = `avatar ${type}-avatar`;
        avatar.innerHTML = type === 'user' ? userAvatarSVG : aiAvatarSVG;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        if (content === '...') {
            contentDiv.innerHTML = loadingSpinnerHTML;
        } else {
            renderContent(contentDiv, content);
        }
        
        messageDiv.appendChild(avatar); messageDiv.appendChild(contentDiv);
        ui.messageContainer.appendChild(messageDiv);
        ui.messageContainer.scrollTop = ui.messageContainer.scrollHeight;
        return contentDiv;
    };
    
    const handleSendMessage = async () => {
        const userMessage = ui.messageInput.value.trim();
        if (!userMessage) return;
        const config = { apiUrl: settings.apiUrl.value, apiKey: settings.apiKey.value, modelName: settings.modelName.value, systemPrompt: settings.systemPrompt.value };
        if (!config.apiUrl || !config.apiKey || !config.modelName) { alert('请在设置中填写 API URL、密钥和模型名称。'); return; }
        
        addMessage(userMessage, 'user');
        conversationHistory.push({ role: 'user', content: userMessage });
        ui.messageInput.value = ''; ui.messageInput.style.height = 'auto';

        const botMessageElement = addMessage('...', 'bot');
        let botFullResponse = '';

        try {
            const messagesPayload = [{ role: 'system', content: config.systemPrompt }, ...conversationHistory];
            const response = await fetch(config.apiUrl, {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
                body: JSON.stringify({ model: config.modelName, messages: messagesPayload, stream: true })
            });
            if (!response.ok) throw new Error(`API Error: ${response.status} ${response.statusText}`);
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(line => line.startsWith('data: '));
                for (const line of lines) {
                    const data = line.substring(6);
                    if (data.trim() === '[DONE]') continue;
                    try {
                        const json = JSON.parse(data);
                        const contentChunk = json.choices[0]?.delta?.content || '';
                        if (contentChunk) {
                            botFullResponse += contentChunk;
                            botMessageElement.textContent = botFullResponse;
                            ui.messageContainer.scrollTop = ui.messageContainer.scrollHeight;
                        }
                    } catch (e) {}
                }
            }
        } catch (error) { botFullResponse = `出现错误: ${error.message}`; }
        finally {
            if (botFullResponse) {
                renderContent(botMessageElement, botFullResponse);
                conversationHistory.push({ role: 'assistant', content: botFullResponse });
            } else { botMessageElement.parentElement.remove(); }
            ui.messageContainer.scrollTop = ui.messageContainer.scrollHeight;
        }
    };

    // --- EVENT LISTENERS & STARTUP ---
    ui.saveBtn.addEventListener('click', saveSettings);
    ui.themeToggleBtn.addEventListener('click', () => {
        const newTheme = document.body.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });
    ui.newChatBtn.addEventListener('click', startNewChat);
    settings.backgroundUrl.addEventListener('keypress', (e) => { if (e.key === 'Enter') { updateBackground(settings.backgroundUrl.value); saveSettings(); } });
    ui.sendBtn.addEventListener('click', handleSendMessage);
    ui.messageInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } });
    ui.messageInput.addEventListener('input', () => { ui.messageInput.style.height = 'auto'; ui.messageInput.style.height = `${ui.messageInput.scrollHeight}px`; });

    const toggleSidebar = () => { ui.sidebar.classList.toggle('open'); ui.overlay.classList.toggle('open'); };
    ui.menuToggle.addEventListener('click', toggleSidebar);
    ui.overlay.addEventListener('click', toggleSidebar);

    initializePresets();
    loadSettings();
    startNewChat();
});