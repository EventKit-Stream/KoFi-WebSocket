// Constants
const CONFIG = {
    TIMEOUT_MS: 5000,
    COPY_TIMEOUT_MS: 2000
};

// Codes
const http_protocol = 'https:'; // window.location.protocol;
const ws_protocol = 'wss:'; // window.location.protocol.replace('http', 'ws');
const host = 'api-ko-fi.eventkit.stream'; // window.location.host;

const ws_code = `${ws_protocol}//${host}/ws/YOUR_VERIFICATION_TOKEN`;
const webhook_code = `${http_protocol}//${host}/webhook`
const ws_connect_code = `const ws = new WebSocket('${ws_code}');`

const handle_events_code = `
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    switch(data.type) {
        case "Donation":
            console.log(\`New donation from \${data.from_name}: \${data.amount} \${data.currency}\`);
            break;
        case "Subscription":
            console.log(\`New subscriber: \${data.from_name}\`);
            break;
        case "Shop Order":
            console.log(\`New shop order from \${data.from_name}\`);
            break;
    }
};`

const implementation_code = `
<!-- Add this to your HTML -->
<div id="kofi-notifications"></div>

<!-- Add this to your JavaScript file or <script> tag -->
<script>
    document.addEventListener('DOMContentLoaded', () => {
        class KofiWebSocket {
            constructor(token) {
                this.token = token;
                this.connect();
            }

            connect() {
                this.ws = new WebSocket(\`${ws_protocol}//${host}/ws/\${this.token}\`);

                this.ws.onopen = () => {
                    console.log('Connected to Ko-fi WebSocket');
                    this.showNotification('Connected to Ko-fi WebSocket', 'success');
                };

                this.ws.onmessage = (event) => {
                    // Create and dispatch a custom event
                    const kofiEvent = new CustomEvent('onEventReceived', {
                        detail: {
                            event: JSON.parse(event.data)
                        }
                    });
                    switch (kofiEvent.detail.event.type) {
                        case "Donation":
                            kofiEvent.detail.listener = "kofi-donation-latest";
                            break;
                        case "Subscription":
                            kofiEvent.detail.listener = "kofi-subscription-latest";
                            break;
                        case "Shop Order":
                            kofiEvent.detail.listener = "kofi-order-latest";
                            break;
                        default:
                            kofiEvent.detail.listener = \`kofi-\${eventData.type.toLowerCase()}-latest\`;
                    }
                    document.dispatchEvent(kofiEvent);
                };

                this.ws.onclose = () => {
                    console.log('Disconnected from Ko-fi WebSocket');
                    this.showNotification('Connection lost, reconnecting...', 'error');
                    // Reconnect after 5 seconds
                    setTimeout(() => this.connect(), 5000);
                };

                this.ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    this.showNotification('Connection error', 'error');
                };
            }

            showNotification(message, type = 'info') {
                const notification = document.createElement('div');
                notification.className = \`kofi-notification \${type}\`;
                notification.innerHTML = \`
                <p>\${message}</p>
            \`;

                document.getElementById('kofi-notifications').appendChild(notification);
                setTimeout(() => notification.remove(), 5000);
            }
        }

        // Initialize on page load with your token
        const kofi = new KofiWebSocket('YOUR_VERIFICATION_TOKEN');

        // Handle Ko-fi events
        document.addEventListener('onEventReceived', (event) => {
            const data = event.detail.event;
            let message = '';
            console.log(data);
            switch (event.detail.listener) {
                case "kofi-donation-latest":
                    message = \`\${data.from_name} donated \${data.amount} \${data.currency} <br> \${data.message}\`;
                    break;
                case "kofi-subscription-latest":
                    if (data.is_first_subscription_payment) {
                        message = \`\${data.from_name} subscribed! <br> \${data.message}\`;
                    }
                    else {
                        message = \`\${data.from_name} renewed their \${data.tier_name} tier subscription!\`;
                    }
                    break;
                case "kofi-order-latest":
                    message = \`\${data.from_name} placed a \${data.amount} \${data.currency} order, what a champ!\`;
                    break;
                default:
                    message = \`New event from \${data.from_name}\`;
            }

            kofi.showNotification(message, 'info');
        });
    });
</script>`

// Theme Management
class ThemeManager {
    constructor() {
        this.themeToggle = document.getElementById('theme-toggle');
        this.sunStatic = document.getElementById('sun-static');
        this.moonStatic = document.getElementById('moon-static');
        this.sunTransition = document.getElementById('sun-transition');
        this.moonTransition = document.getElementById('moon-transition');
        this.isFirstLoad = true;
        this.init();
    }

    init() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            this.setTheme(savedTheme === 'forest');
        } else {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.setTheme(prefersDark);
        }

        this.themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            this.setTheme(currentTheme === 'winter');
        });
    }

    setTheme(isDark) {
        const theme = isDark ? 'forest' : 'winter';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        document.getElementById('prism-light').disabled = isDark;
        document.getElementById('prism-dark').disabled = !isDark;

        if (this.isFirstLoad) {
            this.sunStatic.classList.toggle('hidden', !isDark);
            this.moonStatic.classList.toggle('hidden', isDark);
            this.sunTransition.classList.add('hidden');
            this.moonTransition.classList.add('hidden');
            this.isFirstLoad = false;
        } else {
            this.sunStatic.classList.add('hidden');
            this.moonStatic.classList.add('hidden');
            this.sunTransition.classList.toggle('hidden', !isDark);
            this.moonTransition.classList.toggle('hidden', isDark);
        }
    }
}

// Navigation Manager
class NavigationManager {
    constructor() {
        this.scrollProgress = document.getElementById('scroll-progress');
        this.init();
    }

    init() {
        window.addEventListener('scroll', () => requestAnimationFrame(this.highlightSection.bind(this)));
        window.addEventListener('hashchange', () => setTimeout(this.highlightSection.bind(this), 50));
    }

    highlightSection() {
        const sections = Array.from(document.querySelectorAll('section')).map(section => section.id).filter(Boolean);
        const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
        this.scrollProgress.style.height = `${scrollPercent}%`;

        let current = '';
        for (const id of sections) {
            const section = document.getElementById(id);
            if (section?.getBoundingClientRect().top <= 100) {
                current = id;
            }
        }

        document.querySelectorAll('nav a').forEach(link => {
            const href = link.getAttribute('href').substring(1);
            link.classList.toggle('text-primary', href === current);
            link.classList.toggle('font-medium', href === current);
        });
    }
}

// WebSocket Demo Manager
class WebSocketDemo {
    constructor() {
        this.ws = null;
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('connect-button').addEventListener('click', () => this.toggleConnection());
        document.getElementById('send-test-button').addEventListener('click', () => this.sendTestMessage());
        document.getElementById('clear-messages-button').addEventListener('click', () => this.clearTerminal());
    }

    toggleConnection() {
        if (this.ws) {
            this.disconnectTestSocket();
        } else {
            this.connectTestSocket();
        }
    }

    connectTestSocket() {
        const wsUrlBase = document.getElementById('server-input').value.trim();
        const token = document.getElementById('token-input').value.trim();
        if (!token) {
            this.writeToTerminal('Please enter a verification token', 'error');
            return;
        }

        const wsUrl = `${wsUrlBase}/ws/${token}`;

        try {
            this.ws = new WebSocket(wsUrl);

            // Set a connection timeout
            const connectionTimeout = setTimeout(() => {
                if (this.ws.readyState !== WebSocket.OPEN) {
                    this.ws.close();
                    this.writeToTerminal('Connection timed out. Please check your token and try again.', 'error');
                    this.updateButtons(false);
                    this.ws = null;
                }
            }, CONFIG.TIMEOUT_MS);

            this.ws.onopen = () => {
                clearTimeout(connectionTimeout);
                this.writeToTerminal('WebSocket Connected', 'success');
                this.updateButtons(true);
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.writeToTerminal(data);
                } catch {
                    this.writeToTerminal(event.data, 'data');
                }
            };

            this.ws.onclose = (event) => {
                clearTimeout(connectionTimeout);
                const reason = event.code === 1000 ? 'Normal closure' :
                    event.code === 1006 ? 'Connection lost' :
                        event.code === 1015 ? 'Invalid token' :
                            `Code: ${event.code}`;
                this.writeToTerminal(`WebSocket Disconnected (${reason})`, 'error');
                this.updateButtons(false);
                this.ws = null;
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.writeToTerminal('Failed to connect. Please check the url and/or your token and try again.', 'error');
                this.ws.close();
            };
        } catch (error) {
            this.writeToTerminal(`Failed to create WebSocket connection: ${error.message}`, 'error');
            this.updateButtons(false);
            this.ws = null;
        }
    }

    disconnectTestSocket() {
        if (this.ws) {
            this.ws.close(1000, 'User disconnected');
        }
    }

    sendTestMessage() {
        if (!this.ws) {
            this.writeToTerminal('WebSocket not connected', 'error');
            return;
        }

        const token = document.getElementById('token-input').value.trim();
        if (!token) {
            this.writeToTerminal('Please enter a verification token', 'error');
            return;
        }

        const baseUrl = `${window.location.protocol}//${window.location.host}/webhook`;

        this.writeToTerminal('Sending test message...', 'data');

        const webhookData = {
            verification_token: token,
            message_id: `test_${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: "Donation",
            is_public: true,
            from_name: "Test User",
            message: "This is a test donation!",
            amount: "5.00",
            url: "https://ko-fi.com/test",
            email: "test@example.com",
            currency: "USD",
            is_subscription_payment: false,
            is_first_subscription_payment: false,
            kofi_transaction_id: `TX_${Date.now()}`,
            shop_items: null,
            tier_name: null,
            shipping: null
        };

        const formData = new URLSearchParams();
        formData.append('data', JSON.stringify(webhookData));

        fetch(`${baseUrl}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData
        })
            .then(response => response.json())
            .then(data => this.writeToTerminal(data, 'success'))
            .catch(error => this.writeToTerminal(`Error: ${error.message}`, 'error'));
    }

    writeToTerminal(message, type = 'data') {
        const terminal = document.getElementById('terminal');
        const entry = document.createElement('div');
        entry.className = `terminal-entry ${type === 'error' ? 'text-error' : type === 'success' ? 'text-success' : ''}`;
        console.log(message);

        if (typeof message === 'object') {
            if (Object.keys(message).includes('status')) {
                entry.textContent = "Status: " + message['status'];
            } else {
                const formattedElement = this.formatJSON(message);
                entry.appendChild(formattedElement);
            }
        } else {
            entry.textContent = message;
        }

        terminal.appendChild(entry);
        terminal.scrollTop = terminal.scrollHeight;
    }

    clearTerminal() {
        document.getElementById('terminal').innerHTML = '';
    }

    updateButtons(connected) {
        const connectButton = document.getElementById('connect-button');
        document.getElementById('send-test-button').disabled = !connected;
        document.getElementById('server-input').disabled = connected;
        document.getElementById('token-input').disabled = connected;

        connectButton.textContent = connected ? 'Disconnect' : 'Connect';
        connectButton.classList.toggle('connected', connected);
        connectButton.classList.toggle('btn-error', connected);
        connectButton.classList.toggle('btn-primary', !connected);
    }

    formatJSON(jsonData) {
        // The second parameter (2) controls the default expand depth
        const formatter = new JSONFormatter(jsonData, 2,
            {
                theme: 'dark',
                animateOpen: true,
                animateClose: true,
                hoverPreviewEnabled: true,
                hoverPreviewArrayCount: 100,
                hoverPreviewFieldCount: 5
            }
        );
        return formatter.render();
    }
}

// Code Block Manager
class CodeBlockManager {
    constructor() {
        this.init();
    }

    init() {
        this.loadCode('ws-code', 'javascript', ws_code.trim());
        this.loadCode('webhook-code', 'javascript', webhook_code.trim());
        this.loadCode('ws-connect-code', 'javascript', ws_connect_code.trim());
        this.loadCode('handle-events-code', 'javascript', handle_events_code.trim());
        this.loadCode('implementation-code', 'html', implementation_code.trim());

        document.querySelectorAll('.code-block').forEach(block => {
            const pre = block.querySelector('pre');
            this.setupCopyButton(block, pre);
        });
        Prism.highlightAll();
    }

    loadCode(id, language, code) {
        const pre = document.createElement('pre');
        const codeBlock = document.createElement('code');
        codeBlock.className = `language-${language}`;
        codeBlock.textContent = code.trim();
        pre.appendChild(codeBlock);
        document.getElementById(id).appendChild(pre);
    }

    setupCopyButton(block, pre) {
        if (block.className.includes('no-copy')) return;
        if (block.className.includes('copy')) {

            const copyButton = document.createElement('button');
            copyButton.className = 'copy-button';
            copyButton.innerHTML = '<iconify-icon icon="tabler:copy-plus" width="24" height="24" fill="currentColor"></iconify-icon>';

            copyButton.addEventListener('click', async () => {
                await navigator.clipboard.writeText(pre.textContent);
                copyButton.classList.add('copied');
                copyButton.innerHTML = '<iconify-icon icon="tabler:checks" width="24" height="24" class="text-success"></iconify-icon>';

                setTimeout(() => {
                    copyButton.classList.remove('copied');
                    copyButton.innerHTML = '<iconify-icon icon="tabler:copy-plus" width="24" height="24" fill="currentColor"></iconify-icon>';
                }, CONFIG.COPY_TIMEOUT_MS);
            });

            block.appendChild(copyButton);
        }
    }
}

// Version Badge Manager
class VersionBadgeManager {
    constructor() {
        this.init();
    }

    async init() {
        try {
            const response = await fetch(`${http_protocol}//${host}/version`);
            const data = await response.json();
            document.getElementById('version-badge').textContent = 'v' + data.version;
        } catch (error) {
            console.error('Error fetching version:', error);
            document.getElementById('version-badge').textContent = 'Version unknown';
        }
    }
}

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ThemeManager();
    new NavigationManager();
    new WebSocketDemo();
    new CodeBlockManager();
    new VersionBadgeManager();
});