// Fetch the version from the server
fetch('/version')
    .then(response => response.json())
    .then(data => {
        const version = 'v' + data.version;
        document.getElementById('version-badge').textContent = version;
    })
    .catch(error => {
        console.error('Error fetching version:', error);
        document.getElementById('version-badge').textContent = 'Version unknown';
    });

document.querySelectorAll('.code-block').forEach(block => {
    const pre = block.querySelector('pre');

    // Set the correct protocol based on the current page
    if (pre.textContent.includes('protocol')) {
        const protocol = window.location.protocol;
        pre.textContent = pre.textContent.replace('{{ WSprotocol }}', protocol.replace('http', 'ws'));
        pre.textContent = pre.textContent.replace('{{ HTTPprotocol }}', protocol);
    }

    // Set the correct hostname based on the current page
    if (pre.textContent.includes('HOSTNAME')) {
        const hostname = window.location.hostname;
        const port = window.location.port;
        pre.textContent = pre.textContent.replace('{{ HOSTNAME }}', hostname + (port ? ':' + port : ''));
    }

    // Add copy button only to the webhook setup code block
    if (pre.id === 'webhook-url' || pre.id === 'example-implementation') {
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-button';
        copyButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
            </svg>
        `;

        copyButton.addEventListener('click', async () => {
            const code = pre.textContent;
            await navigator.clipboard.writeText(code);

            copyButton.classList.add('copied');
            copyButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
            `;

            setTimeout(() => {
                copyButton.classList.remove('copied');
                copyButton.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                `;
            }, 2000);
        });

        block.appendChild(copyButton);
    }

    // Convert code blocks to use Prism.js
    let language = 'javascript';
    if (pre.id === 'example-implementation') language = 'html';
    pre.className = `language-${language}`;
    pre.innerHTML = `<code class="language-${language}">${pre.innerHTML}</code>`;
});

// Highlight all code blocks
Prism.highlightAll();

let testWs = null;

function formatJSON(jsonData) {
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

function writeToTerminal(message, type = 'data') {
    const terminal = document.getElementById('terminal');
    const entry = document.createElement('div');
    entry.className = `terminal-entry ${type === 'error' ? 'text-error' : type === 'success' ? 'text-success' : ''}`;
    console.log(message);

    if (typeof message === 'object') {
        if (Object.keys(message).includes('status')) {
            entry.textContent = "Status: " + message['status'];
        } else {
            const formattedElement = formatJSON(message);
            entry.appendChild(formattedElement);  // Changed from innerHTML to appendChild
        }
    } else {
        entry.textContent = message;
    }

    terminal.appendChild(entry);
    terminal.scrollTop = terminal.scrollHeight;
}

function clearTerminal() {
    document.getElementById('terminal').innerHTML = '';
}

function updateButtons(connected) {
    const connectButton = document.getElementById('connect-button');
    document.getElementById('send-test-button').disabled = !connected;
    document.getElementById('token-input').disabled = connected;

    connectButton.textContent = connected ? 'Disconnect' : 'Connect';
    connectButton.classList.toggle('connected', connected);
}

function toggleConnection() {
    if (testWs) {
        disconnectTestSocket();
    } else {
        connectTestSocket();
    }
}

function connectTestSocket() {
    const token = document.getElementById('token-input').value.trim();
    if (!token) {
        writeToTerminal('Please enter a verification token', 'error');
        return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/${token}`;

    testWs = new WebSocket(wsUrl);

    testWs.onopen = () => {
        writeToTerminal('WebSocket Connected', 'success');
        updateButtons(true);
    };

    testWs.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            writeToTerminal(data);
        } catch {
            writeToTerminal(event.data, 'data');
        }
    };

    testWs.onclose = () => {
        writeToTerminal('WebSocket Disconnected', 'error');
        updateButtons(false);
        testWs = null;
    };

    testWs.onerror = (error) => {
        writeToTerminal(`WebSocket Error: ${error.message}`, 'error');
    };
}

function disconnectTestSocket() {
    if (testWs) {
        testWs.close();
    }
}

function sendTestMessage() {
    if (!testWs) {
        writeToTerminal('WebSocket not connected', 'error');
        return;
    }

    const token = document.getElementById('token-input').value.trim();
    if (!token) {
        writeToTerminal('Please enter a verification token', 'error');
        return;
    }

    const baseUrl = `${window.location.protocol}//${window.location.host}`;

    writeToTerminal('Sending test message...', 'data');

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

    fetch(`${baseUrl}/webhook`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData
    })
        .then(response => response.json())
        .then(data => writeToTerminal(data, 'success'))
        .catch(error => writeToTerminal(`Error: ${error.message}`, 'error'));
}

document.addEventListener('scroll', highlightSection);
document.addEventListener('DOMContentLoaded', () => {
    highlightSection();

    // Theme management
    // window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    //     const isDark = e.matches;
    //     document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    // });
    const themeToggle = document.getElementById('theme-toggle');
    const sunIcon = document.getElementById('sun-icon');
    const moonIcon = document.getElementById('moon-icon');

    function setTheme(isDark) {
        // Update the color scheme preference
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';

        // Toggle Prism themes
        document.getElementById('prism-light').disabled = isDark;
        document.getElementById('prism-dark').disabled = !isDark;

        sunIcon.classList.toggle('hidden', !isDark);
        moonIcon.classList.toggle('hidden', isDark);
    }

    // Initialize theme based on system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(prefersDark);

    // Theme toggle button handler
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        setTheme(currentTheme === 'light');
    });

    highlightSection();
});

window.addEventListener('hashchange', () => {
    setTimeout(highlightSection, 100);
});

function highlightSection() {
    const sections = ['header', 'features', 'quick-start', 'getting-started'];
    let current = '';

    // Calculate scroll progress
    const scrollProgress = document.getElementById('scroll-progress');
    const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
    scrollProgress.style.height = `${scrollPercent}%`;

    // Find current section
    for (const id of sections) {
        const section = document.getElementById(id);
        if (section && section.getBoundingClientRect().top <= 100) {
            current = id;
        }
    }

    // Update navigation links
    document.querySelectorAll('nav a').forEach(link => {
        const href = link.getAttribute('href').substring(1); // Remove #
        if (href === current) {
            link.classList.add('text-primary', 'font-medium');
        } else {
            link.classList.remove('text-primary', 'font-medium');
        }
    });
}

// Add scroll event listener
window.addEventListener('scroll', () => {
    requestAnimationFrame(highlightSection);
});