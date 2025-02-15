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
            <iconify-icon icon="tabler:copy-plus" width="24" height="24" fill="currentColor"></iconify-icon>
        `;

        copyButton.addEventListener('click', async () => {
            const code = pre.textContent;
            await navigator.clipboard.writeText(code);

            copyButton.classList.add('copied');
            copyButton.innerHTML = `
                <iconify-icon icon="tabler:checks" width="24" height="24" class="text-success" ></iconify-icon>
            `;

            setTimeout(() => {
                copyButton.classList.remove('copied');
                copyButton.innerHTML = `
                    <iconify-icon icon="tabler:copy-plus" width="24" height="24" fill="currentColor"></iconify-icon>
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

    try {
        testWs = new WebSocket(wsUrl);

        // Set a connection timeout
        const connectionTimeout = setTimeout(() => {
            if (testWs.readyState !== WebSocket.OPEN) {
                testWs.close();
                writeToTerminal('Connection timed out. Please check your token and try again.', 'error');
                updateButtons(false);
                testWs = null;
            }
        }, 5000); // 5 second timeout

        testWs.onopen = () => {
            clearTimeout(connectionTimeout);
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

        testWs.onclose = (event) => {
            clearTimeout(connectionTimeout);
            const reason = event.code === 1000 ? 'Normal closure' :
                event.code === 1006 ? 'Connection lost' :
                    event.code === 1015 ? 'Invalid token' :
                        `Code: ${event.code}`;
            writeToTerminal(`WebSocket Disconnected (${reason})`, 'error');
            updateButtons(false);
            testWs = null;
        };

        testWs.onerror = (error) => {
            writeToTerminal('Failed to connect. Please check your token and try again.', 'error');
            testWs.close();
        };
    } catch (error) {
        writeToTerminal(`Failed to create WebSocket connection: ${error.message}`, 'error');
        updateButtons(false);
        testWs = null;
    }
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

    const baseUrl = `${window.location.protocol}//${window.location.host}/webhook`;
    // const baseUrl = `http://localhost/webhook`;

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

    fetch(`${baseUrl}`, {
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
    const themeToggle = document.getElementById('theme-toggle');
    const sunStatic = document.getElementById('sun-static');
    const moonStatic = document.getElementById('moon-static');
    const sunTransition = document.getElementById('sun-transition');
    const moonTransition = document.getElementById('moon-transition');

    let isFirstLoad = true;

    function setTheme(isDark) {
        console.log(isDark);
        // Update the color scheme preference
        document.documentElement.setAttribute('data-theme', isDark ? 'forest' : 'winter');

        // Toggle Prism themes
        document.getElementById('prism-light').disabled = isDark;
        document.getElementById('prism-dark').disabled = !isDark;

        // Show static icons on first load, transition icons on subsequent changes
        if (isFirstLoad) {
            sunStatic.classList.toggle('hidden', !isDark);
            moonStatic.classList.toggle('hidden', isDark);
            sunTransition.classList.add('hidden');
            moonTransition.classList.add('hidden');
            isFirstLoad = false;
        } else {
            sunStatic.classList.add('hidden');
            moonStatic.classList.add('hidden');
            sunTransition.classList.toggle('hidden', !isDark);
            moonTransition.classList.toggle('hidden', isDark);
        }
    }

    // Initialize theme based on system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(prefersDark);

    // Theme toggle button handler
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        setTheme(currentTheme === 'winter');
    });

    highlightSection();
});

window.addEventListener('hashchange', () => {
    setTimeout(highlightSection, 50);
});

function highlightSection() {
    const sections = Array.from(document.querySelectorAll('section')).map(section => section.id).filter(Boolean);

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