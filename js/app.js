let currentUser = null;
let allUsers = [
    {
        code: 'LSTP',
        name: '李硕',
        gender: '男',
        level: 'Ⅰ',
        nativePlace: '418转416移民',
        points: 100,
        position: '技术科创人员',
        comment: ''
    },
    {
        code: 'MOST',
        name: '牟孜腾',
        gender: '男',
        level: 'Ⅰ',
        nativePlace: '416',
        points: 100,
        position: '总统',
        comment: ''
    },
    {
        code: 'LKYC',
        name: '刘凯赟',
        gender: '男',
        level: 'Ⅰ',
        nativePlace: '416',
        points: 100,
        position: '外交部部长',
        comment: ''
    },
    {
        code: 'ZYZT',
        name: '周翼泽',
        gender: '男',
        level: 'Ⅰ',
        nativePlace: '418',
        points: 100,
        position: '总理',
        comment: ''
    },
    {
        code: 'WZXH',
        name: '汪子轩',
        gender: '男',
        level: 'Ⅰ',
        nativePlace: '418',
        points: 100,
        position: '政治部主任',
        comment: ''
    },
    {
        code: 'CJZF',
        name: '菜金泽',
        gender: '男',
        level: 'Ⅰ',
        nativePlace: '418',
        points: 100,
        position: '国防部部长',
        comment: ''
    },
    {
        code: 'LMYA',
        name: '李孟尧',
        gender: '男',
        level: 'Ⅲ',
        nativePlace: '418',
        points: 100,
        position: '人民群众',
        comment: ''
    },
    {
        code: 'DMXA',
        name: '邓铭熙',
        gender: '女',
        level: 'Ⅲ',
        nativePlace: '503',
        points: 100,
        position: '人民群众',
        comment: ''
    },
    {
        code: '等级一',
        name: '一级人员',
        gender: '男',
        level: 'Ⅰ',
        nativePlace: '无',
        points: 100,
        position: '党员',
        comment: '该人员为辅助测试，不是真正人员'
    },
    {
        code: '等级二',
        name: '二级人员',
        gender: '男',
        level: 'Ⅱ',
        nativePlace: '无',
        points: 100,
        position: '党员',
        comment: '该人员为辅助测试，不是真正人员'
    },
    {
        code: '等级三',
        name: '三级人员',
        gender: '男',
        level: 'Ⅲ',
        nativePlace: '无',
        points: 100,
        position: '候补党员',
        comment: '该人员为辅助测试，不是真正人员'
    }
];
let passwords = {};
let avatars = {};
let messages = [];
let votes = [];
let lastCheckInDate = null;
let monthlyMessageCount = 0;
let userPoints = {};
let config = null;

let dataCache = {
    config: null,
    passwords: null,
    avatars: null,
    messages: null,
    votes: null,
    colorSettings: null,
    lastLoadTime: 0
};

const CACHE_DURATION = 5 * 60 * 1000;

async function loadConfig() {
    try {
        const response = await fetch('config.json');
        config = await response.json();
        console.log('配置加载成功');
    } catch (error) {
        console.error('加载配置失败:', error);
        config = {
            jsonbin: {
                apiKey: '',
                binId: '',
                apiUrl: 'https://api.jsonbin.io/v3/b'
            }
        };
    }
}

async function init() {
    await loadConfig();
    
    const now = Date.now();
    const shouldUseCache = dataCache.lastLoadTime > 0 && (now - dataCache.lastLoadTime) < CACHE_DURATION;
    
    if (shouldUseCache) {
        console.log('使用缓存数据');
        if (dataCache.passwords) passwords = dataCache.passwords;
        if (dataCache.avatars) avatars = dataCache.avatars;
        if (dataCache.messages) messages = dataCache.messages;
        if (dataCache.votes) votes = dataCache.votes;
        if (dataCache.colorSettings && currentUser) {
            applyColorSettingsToAllPages(dataCache.colorSettings);
        }
    } else {
        console.log('加载新数据');
        await Promise.all([
            loadUserData(),
            loadPasswords(),
            loadAvatars(),
            loadMessages(),
            loadVotes()
        ]);
        
        dataCache.passwords = passwords;
        dataCache.avatars = avatars;
        dataCache.messages = messages;
        dataCache.votes = votes;
        dataCache.lastLoadTime = now;
    }
    
    loadUserState();
    await loadColorSettings();
    setupEventListeners();
}

async function loadUserData() {
    try {
        let response;
        let text;
        
        try {
            response = await fetch('Information/user_data.html?t=' + Date.now());
            text = await response.text();
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');
            const userElements = doc.querySelectorAll('.user');
            
            allUsers = [];
            userElements.forEach(element => {
                allUsers.push({
                    code: element.getAttribute('data-code'),
                    name: element.getAttribute('data-name'),
                    gender: element.getAttribute('data-gender'),
                    level: element.getAttribute('data-level'),
                    nativePlace: element.getAttribute('data-native-place'),
                    points: parseInt(element.getAttribute('data-points')) || 0,
                    position: element.getAttribute('data-position') || '',
                    comment: element.getAttribute('data-comment') || ''
                });
            });
            
            console.log('成功加载用户数据:', allUsers.length, '个用户');
        } catch (fetchError) {
            console.warn('从文件加载失败，使用内置用户数据:', fetchError);
            console.log('使用内置用户数据:', allUsers.length, '个用户');
        }
    } catch (error) {
        console.error('加载用户数据失败:', error);
        console.log('使用内置用户数据:', allUsers.length, '个用户');
    }
}

async function loadPasswords() {
    try {
        let localPasswords = {};
        try {
            const localData = localStorage.getItem('passwords');
            if (localData) {
                localPasswords = JSON.parse(localData);
                console.log('从localStorage加载密码数据:', Object.keys(localPasswords).length, '个密码');
            }
        } catch (localError) {
            console.warn('从localStorage加载密码数据失败:', localError);
        }

        if (config && config.jsonbin && config.jsonbin.apiKey && config.jsonbin.bins && config.jsonbin.bins.userData) {
            try {
                const response = await fetch(`${config.jsonbin.apiUrl}/${config.jsonbin.bins.userData}/latest`, {
                    headers: {
                        'X-Master-Key': config.jsonbin.apiKey
                    }
                });
                
                const result = await response.json();
                
                console.log('从JSONBin加载用户数据:', result);
                
                if (result.record && result.record.passwords) {
                    passwords = result.record.passwords;
                    localStorage.setItem('passwords', JSON.stringify(passwords));
                    console.log('从JSONBin成功加载密码数据:', Object.keys(passwords).length, '个密码');
                } else {
                    passwords = localPasswords;
                }
                
                if (result.record && result.record.userPoints) {
                    userPoints = result.record.userPoints;
                    console.log('从JSONBin成功加载用户积分数据:', Object.keys(userPoints).length, '个用户');
                }
                
                if (result.record && result.record.monthlyMessageCount !== undefined) {
                    monthlyMessageCount = result.record.monthlyMessageCount;
                    console.log('从JSONBin成功加载每月留言数量:', monthlyMessageCount);
                }
                
                return;
            } catch (jsonbinError) {
                console.warn('从JSONBin加载用户数据失败:', jsonbinError);
                passwords = localPasswords;
            }
        } else {
            passwords = localPasswords;
        }
        
        console.log('使用本地密码数据:', Object.keys(passwords).length, '个密码');
    } catch (error) {
        console.error('加载密码数据失败:', error);
        try {
            const localData = localStorage.getItem('passwords');
            if (localData) {
                passwords = JSON.parse(localData);
            } else {
                passwords = {};
            }
        } catch (localError) {
            passwords = {};
        }
    }
}

async function loadAvatars() {
    try {
        if (config && config.jsonbin && config.jsonbin.apiKey && config.jsonbin.bins && config.jsonbin.bins.avatars) {
            try {
                const response = await fetch(`${config.jsonbin.apiUrl}/${config.jsonbin.bins.avatars}/latest`, {
                    headers: {
                        'X-Master-Key': config.jsonbin.apiKey
                    }
                });
                
                const result = await response.json();
                
                if (result.record && result.record.avatars) {
                    avatars = result.record.avatars;
                    console.log('从JSONBin成功加载头像数据:', Object.keys(avatars).length, '个头像');
                }
                
                return;
            } catch (jsonbinError) {
                console.warn('从JSONBin加载头像失败:', jsonbinError);
            }
        }
        
        console.log('使用空头像数据');
        avatars = {};
    } catch (error) {
        console.error('加载头像数据失败:', error);
        avatars = {};
    }
}

async function saveAvatar(code, avatarData) {
    try {
        avatars[code] = avatarData;
        
        console.log('开始保存头像:', code, '数据大小:', avatarData.length, '字节');
        
        if (config && config.jsonbin && config.jsonbin.apiKey && config.jsonbin.bins && config.jsonbin.bins.avatars) {
            try {
                const dataToSave = {
                    avatars: avatars
                };
                
                const dataSize = JSON.stringify(dataToSave).length;
                console.log('准备保存到JSONBin，总数据大小:', dataSize, '字节');
                
                const response = await fetch(`${config.jsonbin.apiUrl}/${config.jsonbin.bins.avatars}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Master-Key': config.jsonbin.apiKey
                    },
                    body: JSON.stringify(dataToSave)
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    console.log('头像保存到JSONBin成功:', code);
                    alert('头像上传成功并已同步到所有设备');
                    return;
                } else {
                    console.error('保存到JSONBin失败:', result);
                    alert('头像保存失败: ' + (result.message || '未知错误'));
                    return;
                }
            } catch (jsonbinError) {
                console.error('保存到JSONBin失败:', jsonbinError);
                alert('头像保存失败，请检查网络连接');
                return;
            }
        }
        
        console.log('头像保存到本地存储:', code);
    } catch (error) {
        console.error('保存头像失败:', error);
        alert('头像保存失败');
    }
}

async function savePassword(code, password) {
    try {
        passwords[code] = password;
        
        if (config && config.jsonbin && config.jsonbin.apiKey && config.jsonbin.bins && config.jsonbin.bins.userData) {
            try {
                const dataToSave = {
                    passwords: passwords,
                    userPoints: userPoints,
                    monthlyMessageCount: monthlyMessageCount
                };
                
                const response = await fetch(`${config.jsonbin.apiUrl}/${config.jsonbin.bins.userData}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Master-Key': config.jsonbin.apiKey
                    },
                    body: JSON.stringify(dataToSave)
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    console.log('密码保存到JSONBin成功:', code);
                    return;
                } else {
                    console.error('保存到JSONBin失败:', result);
                    alert('密码保存失败: ' + (result.message || '未知错误'));
                    return;
                }
            } catch (jsonbinError) {
                console.error('保存到JSONBin失败:', jsonbinError);
                alert('密码保存失败，请检查网络连接');
                return;
            }
        }
        
        console.log('密码保存到本地存储:', code);
        alert('密码保存失败，请重试');
    } catch (error) {
        console.error('保存密码失败:', error);
        alert('密码保存失败，请重试');
    }
}

async function savePasswords() {
    try {
        if (config && config.jsonbin && config.jsonbin.apiKey && config.jsonbin.bins && config.jsonbin.bins.userData) {
            try {
                const dataToSave = {
                    passwords: passwords,
                    userPoints: userPoints,
                    monthlyMessageCount: monthlyMessageCount
                };
                
                const response = await fetch(`${config.jsonbin.apiUrl}/${config.jsonbin.bins.userData}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Master-Key': config.jsonbin.apiKey
                    },
                    body: JSON.stringify(dataToSave)
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    console.log('密码数据保存到JSONBin成功');
                    return;
                } else {
                    console.error('保存到JSONBin失败:', result);
                    alert('密码数据保存失败: ' + (result.message || '未知错误'));
                    return;
                }
            } catch (jsonbinError) {
                console.error('保存到JSONBin失败:', jsonbinError);
                alert('密码数据保存失败，请检查网络连接');
                return;
            }
        }
        
        console.log('密码数据保存到本地存储');
        alert('密码数据保存失败，请检查配置文件');
    } catch (error) {
        console.error('保存密码数据失败:', error);
        alert('密码数据保存失败，请重试');
    }
}

async function loadMessages() {
    try {
        if (config && config.jsonbin && config.jsonbin.apiKey && config.jsonbin.bins && config.jsonbin.bins.messages) {
            try {
                const response = await fetch(`${config.jsonbin.apiUrl}/${config.jsonbin.bins.messages}/latest`, {
                    headers: {
                        'X-Master-Key': config.jsonbin.apiKey
                    }
                });
                
                const result = await response.json();
                
                if (result.record && result.record.messages) {
                    messages = result.record.messages;
                    console.log('从JSONBin成功加载留言数据:', messages.length, '条留言');
                }
                
                return;
            } catch (jsonbinError) {
                console.warn('从JSONBin加载留言失败:', jsonbinError);
            }
        }
        
        const stored = localStorage.getItem('messages');
        if (stored) {
            messages = JSON.parse(stored);
        }
        
        await recalculateMonthlyMessageCount();
    } catch (error) {
        console.error('加载留言失败:', error);
    }
}

async function recalculateMonthlyMessageCount() {
    if (!currentUser) return;
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    let count = 0;
    messages.forEach(message => {
        if (message.code === currentUser.code && !message.deleted) {
            const messageDate = new Date(message.time);
            if (messageDate.getMonth() === currentMonth && messageDate.getFullYear() === currentYear) {
                count++;
            }
        }
    });
    
    monthlyMessageCount = count;
    await saveUserState();
    await saveMonthlyMessageCount();
}

async function loadVotes() {
    try {
        if (config && config.jsonbin && config.jsonbin.apiKey && config.jsonbin.bins && config.jsonbin.bins.votes) {
            try {
                const response = await fetch(`${config.jsonbin.apiUrl}/${config.jsonbin.bins.votes}/latest`, {
                    headers: {
                        'X-Master-Key': config.jsonbin.apiKey
                    }
                });
                
                const result = await response.json();
                
                if (result.record && result.record.votes) {
                    votes = result.record.votes;
                    console.log('从JSONBin成功加载投票数据:', votes.length, '个投票');
                }
                
                return;
            } catch (jsonbinError) {
                console.warn('从JSONBin加载投票失败:', jsonbinError);
            }
        }
        
        const stored = localStorage.getItem('votes');
        if (stored) {
            votes = JSON.parse(stored);
        }
    } catch (error) {
        console.error('加载投票失败:', error);
    }
}

async function loadColorSettings() {
    try {
        if (config && config.jsonbin && config.jsonbin.apiKey && config.jsonbin.bins && config.jsonbin.bins.colorSettings) {
            try {
                const response = await fetch(`${config.jsonbin.apiUrl}/${config.jsonbin.bins.colorSettings}/latest`, {
                    headers: {
                        'X-Master-Key': config.jsonbin.apiKey
                    }
                });
                
                const result = await response.json();
                
                if (result.record && result.record[currentUser.code]) {
                    const settings = result.record[currentUser.code];
                    applyColorSettingsToAllPages(settings);
                    console.log('从JSONBin成功加载颜色设置:', settings);
                }
                
                return;
            } catch (jsonbinError) {
                console.warn('从JSONBin加载颜色设置失败:', jsonbinError);
            }
        }
        
        const savedSettings = localStorage.getItem('colorSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            applyColorSettingsToAllPages(settings);
        }
    } catch (error) {
        console.error('加载颜色设置失败:', error);
    }
}

function applyColorSettingsToAllPages(settings) {
    const root = document.documentElement;
    
    if (settings.primary) {
        root.style.setProperty('--primary-color', settings.primary);
        document.body.style.setProperty('--primary-color', settings.primary);
    }
    
    if (settings.secondary) {
        root.style.setProperty('--secondary-color', settings.secondary);
        document.body.style.setProperty('--secondary-color', settings.secondary);
    }
    
    if (settings.background) {
        root.style.setProperty('--background-color', settings.background);
        document.body.style.background = settings.background;
    }
    
    if (settings.text) {
        root.style.setProperty('--text-color', settings.text);
        document.body.style.color = settings.text;
    }
    
    const sidebar = document.querySelector('.sidebar');
    if (sidebar && settings.primary) {
        sidebar.style.background = settings.primary;
    }
    
    const loginBox = document.querySelector('.login-box');
    if (loginBox && settings.primary) {
        loginBox.style.background = settings.primary;
    }
    
    const content = document.querySelector('.content');
    if (content && settings.text) {
        content.style.color = settings.text;
    }
}

function loadUserState() {
    const savedCode = localStorage.getItem('savedCode') || sessionStorage.getItem('currentSessionCode');
    if (savedCode) {
        const user = allUsers.find(u => u.code.toLowerCase() === savedCode.toLowerCase());
        if (user) {
            currentUser = { ...user };
            
            let state = null;
            const userState = localStorage.getItem(`userState_${currentUser.code}`);
            if (userState) {
                state = JSON.parse(userState);
            }
            
            if (monthlyMessageCount === 0) {
                monthlyMessageCount = state?.monthlyMessageCount || 0;
            }
            
            if (userPoints && userPoints[currentUser.code] !== undefined) {
                currentUser.points = userPoints[currentUser.code].points;
                lastCheckInDate = userPoints[currentUser.code].lastCheckInDate;
                console.log('从云端加载用户积分:', currentUser.code, currentUser.points);
            } else {
                if (state) {
                    currentUser.points = state.points;
                    lastCheckInDate = state.lastCheckInDate;
                } else {
                    currentUser.points = 100;
                    lastCheckInDate = null;
                }
            }
            
            const currentYear = new Date().getFullYear();
            const currentMonth = new Date().getMonth();
            const currentDay = new Date().getDate();
            
            if (currentMonth === 0 && currentDay === 1) {
                const lastResetYear = state?.lastResetYear || 0;
                if (lastResetYear !== currentYear) {
                    currentUser.points = 100;
                    lastCheckInDate = null;
                    state = state || {};
                    state.lastResetYear = currentYear;
                    state.points = 100;
                    localStorage.setItem(`userState_${currentUser.code}`, JSON.stringify(state));
                }
            }
        }
    }
}

async function saveUserState() {
    if (currentUser) {
        const state = {
            points: currentUser.points,
            lastCheckInDate: lastCheckInDate,
            monthlyMessageCount: monthlyMessageCount,
            lastResetYear: new Date().getFullYear()
        };
        localStorage.setItem(`userState_${currentUser.code}`, JSON.stringify(state));
        
        userPoints[currentUser.code] = {
            points: currentUser.points,
            lastCheckInDate: lastCheckInDate,
            lastResetYear: new Date().getFullYear()
        };
        
        await saveMonthlyMessageCount();
    }
}

async function saveMonthlyMessageCount() {
    if (config && config.jsonbin && config.jsonbin.apiKey && config.jsonbin.bins && config.jsonbin.bins.userData) {
        try {
            const dataToSave = {
                passwords: passwords,
                userPoints: userPoints,
                monthlyMessageCount: monthlyMessageCount
            };
            
            console.log('保存每月留言数量到JSONBin，总数据大小:', JSON.stringify(dataToSave).length, '字节');
            
            const response = await fetch(`${config.jsonbin.apiUrl}/${config.jsonbin.bins.userData}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': config.jsonbin.apiKey
                },
                body: JSON.stringify(dataToSave)
            });
            
            if (response.ok) {
                console.log('每月留言数量保存到JSONBin成功');
            } else {
                console.error('保存每月留言数量到JSONBin失败');
            }
        } catch (error) {
            console.error('保存每月留言数量到JSONBin失败:', error);
        }
    }
}

function setupEventListeners() {
    const savedCode = localStorage.getItem('savedCode');
    if (savedCode) {
        const codeInput = document.getElementById('codeInput');
        if (codeInput) {
            codeInput.value = savedCode;
        }
    }
    
    const codeInput = document.getElementById('codeInput');
    if (codeInput) {
        codeInput.addEventListener('input', function() {
            checkPasswordRequirement(this.value.trim());
        });
    }
}

function getDeviceId() {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
        deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
}

function checkPasswordRequirement(code) {
    const passwordSection = document.getElementById('passwordSection');
    if (!passwordSection) return;
    
    if (!code) {
        passwordSection.style.display = 'none';
        const passwordInput = document.getElementById('passwordInput');
        if (passwordInput) {
            passwordInput.value = '';
        }
        return;
    }
    
    const user = allUsers.find(u => u.code.toLowerCase() === code.toLowerCase());
    if (!user) {
        passwordSection.style.display = 'none';
        const passwordInput = document.getElementById('passwordInput');
        if (passwordInput) {
            passwordInput.value = '';
        }
        return;
    }
    
    const userPassword = passwords[user.code];
    if (!userPassword) {
        passwordSection.style.display = 'none';
        const passwordInput = document.getElementById('passwordInput');
        if (passwordInput) {
            passwordInput.value = '';
        }
        return;
    }
    
    const deviceId = getDeviceId();
    const knownDevices = JSON.parse(localStorage.getItem(`knownDevices_${user.code}`) || '[]');
    
    if (knownDevices.includes(deviceId)) {
        passwordSection.style.display = 'none';
        const passwordInput = document.getElementById('passwordInput');
        if (passwordInput) {
            passwordInput.value = '';
        }
    } else {
        passwordSection.style.display = 'block';
    }
}

async function login() {
    const codeInput = document.getElementById('codeInput').value.trim();
    const passwordInput = document.getElementById('passwordInput').value.trim();
    const rememberMe = document.getElementById('rememberMe').checked;
    
    if (!codeInput) {
        alert('请输入代号');
        return;
    }

    const user = allUsers.find(u => u.code.toLowerCase() === codeInput.toLowerCase());
    
    if (!user) {
        alert('代号不存在');
        return;
    }

    const userPassword = passwords[user.code];
    
    if (userPassword) {
        const deviceId = getDeviceId();
        const knownDevices = JSON.parse(localStorage.getItem(`knownDevices_${user.code}`) || '[]');
        
        if (!knownDevices.includes(deviceId)) {
            if (passwordInput !== userPassword) {
                alert('密码错误');
                return;
            }
            
            knownDevices.push(deviceId);
            localStorage.setItem(`knownDevices_${user.code}`, JSON.stringify(knownDevices));
        }
    } else {
        const passwordSection = document.getElementById('passwordSection');
        const isPasswordVisible = passwordSection && passwordSection.style.display !== 'none';
        
        if (isPasswordVisible && passwordInput) {
            alert('该账号未设置密码，请留空密码框');
            return;
        }
        
        if (!isPasswordVisible) {
            const passwordInputField = document.getElementById('passwordInput');
            if (passwordInputField) {
                passwordInputField.value = '';
            }
        }
        
        const setPassword = confirm('您是第一次登录，是否设置登录密码？');
        if (setPassword) {
            const newPassword = prompt('请输入您的登录密码：');
            if (!newPassword || newPassword.trim() === '') {
                alert('密码不能为空，登录取消');
                return;
            }
            
            const confirmPassword = prompt('请再次输入密码确认：');
            if (newPassword !== confirmPassword) {
                alert('两次输入的密码不一致，登录取消');
                return;
            }
            
            savePassword(user.code, newPassword);
            alert('密码设置成功！');
        }
    }

    currentUser = { ...user };
    
    if (rememberMe) {
        localStorage.setItem('savedCode', codeInput);
    } else {
        localStorage.removeItem('savedCode');
    }
    
    sessionStorage.setItem('currentSessionCode', codeInput);

    const userState = localStorage.getItem(`userState_${currentUser.code}`);
    if (userState) {
        const state = JSON.parse(userState);
        currentUser.points = state.points;
        lastCheckInDate = state.lastCheckInDate;
        monthlyMessageCount = state.monthlyMessageCount || 0;
        
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();
        const currentDay = new Date().getDate();
        
        if (currentMonth === 0 && currentDay === 1) {
            const lastResetYear = state.lastResetYear || 0;
            if (lastResetYear !== currentYear) {
                currentUser.points = 100;
                state.lastResetYear = currentYear;
                state.points = 100;
                localStorage.setItem(`userState_${currentUser.code}`, JSON.stringify(state));
            }
        }
    } else {
        currentUser.points = 100;
        lastCheckInDate = null;
        monthlyMessageCount = 0;
    }
    
    if (userPoints && userPoints[currentUser.code] !== undefined) {
        currentUser.points = userPoints[currentUser.code].points;
        lastCheckInDate = userPoints[currentUser.code].lastCheckInDate;
        console.log('从云端加载用户积分:', currentUser.code, currentUser.points);
    }
    
    await saveUserState();
    window.location.href = 'home.html';
}

async function logout() {
    currentUser = null;
    lastCheckInDate = null;
    monthlyMessageCount = 0;
    await saveMonthlyMessageCount();
    sessionStorage.removeItem('currentSessionCode');
    await new Promise(resolve => setTimeout(resolve, 100));
    window.location.href = 'login.html';
}

async function checkIn() {
    const today = new Date().toDateString();
    
    if (lastCheckInDate === today) {
        alert('今日已签到');
        return;
    }
    
    currentUser.points += 15;
    lastCheckInDate = today;
    
    await saveUserState();
    updateUI();
    alert('签到成功！获得15积分');
}

function updateUI() {
    if (!currentUser) return;
    
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
        userNameElement.textContent = currentUser.name;
    }
    
    const userPositionElement = document.getElementById('userPosition');
    if (userPositionElement) {
        userPositionElement.textContent = currentUser.position || '无';
    }
    
    const pointsElement = document.getElementById('points');
    if (pointsElement) {
        pointsElement.textContent = currentUser.points;
    }
    
    const checkInBtn = document.getElementById('checkInBtn');
    if (checkInBtn) {
        const today = new Date().toDateString();
        checkInBtn.disabled = lastCheckInDate === today;
        checkInBtn.textContent = lastCheckInDate === today ? '今日已签到' : '签到';
    }
    
    const messageCountElement = document.getElementById('messageCount');
    if (messageCountElement) {
        let maxMessages = 0;
        let pointsCost = 0;
        
        switch (currentUser.level) {
            case 'Ⅰ':
                maxMessages = 30;
                pointsCost = 0;
                break;
            case 'Ⅱ':
                maxMessages = 10;
                pointsCost = 5;
                break;
            case 'Ⅲ':
                maxMessages = 5;
                pointsCost = 5;
                break;
        }
        
        messageCountElement.textContent = `本月已发送: ${monthlyMessageCount}/${maxMessages}`;
    }
    
    updateAvatar();
}

function updateAvatar() {
    const avatarElement = document.getElementById('userAvatar');
    const avatarPreviewElement = document.getElementById('avatarPreview');
    
    if (!avatarElement && !avatarPreviewElement) return;
    
    let savedAvatar = avatars[currentUser.code];
    if (!savedAvatar) {
        savedAvatar = localStorage.getItem(`avatar_${currentUser.code}`);
    }
    
    if (savedAvatar) {
        if (avatarElement) {
            avatarElement.innerHTML = `<img src="${savedAvatar}" alt="${currentUser.name}">`;
        }
        if (avatarPreviewElement) {
            avatarPreviewElement.innerHTML = `<img src="${savedAvatar}" alt="${currentUser.name}">`;
        }
    } else {
        const firstLetter = currentUser.code.charAt(0).toUpperCase();
        if (avatarElement) {
            avatarElement.textContent = firstLetter;
        }
        if (avatarPreviewElement) {
            avatarPreviewElement.textContent = firstLetter;
        }
    }
}

function getUserAvatar(userCode) {
    const cloudAvatar = avatars[userCode];
    if (cloudAvatar) {
        return cloudAvatar;
    }
    
    const localAvatar = localStorage.getItem(`avatar_${userCode}`);
    if (localAvatar) {
        return localAvatar;
    }
    
    const user = allUsers.find(u => u.code === userCode);
    if (user) {
        return `data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect width="40" height="40" fill="%23ddd"/><text x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-size="20" fill="%23666">${user.code.charAt(0).toUpperCase()}</text></svg>`;
    }
    return '';
}

async function postMessage() {
    const messageInput = document.getElementById('messageInput');
    const content = messageInput.value.trim();
    
    if (!content) {
        alert('请输入留言内容');
        return;
    }
    
    if (content.length > 300) {
        alert('留言内容不能超过300字');
        return;
    }
    
    let maxMessages = 0;
    let pointsCost = 0;
    
    switch (currentUser.level) {
        case 'Ⅰ':
            maxMessages = 30;
            pointsCost = 0;
            break;
        case 'Ⅱ':
            maxMessages = 10;
            pointsCost = 5;
            break;
        case 'Ⅲ':
            maxMessages = 5;
            pointsCost = 5;
            break;
    }
    
    if (monthlyMessageCount >= maxMessages) {
        alert('本月留言次数已用完');
        return;
    }
    
    if (pointsCost > 0 && currentUser.points < pointsCost) {
        alert('积分不足');
        return;
    }
    
    currentUser.points -= pointsCost;
    monthlyMessageCount++;
    await saveUserState();
    
    const message = {
        id: Date.now(),
        code: currentUser.code,
        name: currentUser.name,
        content: content,
        time: new Date().toLocaleString(),
        deleted: false
    };
    
    messages.unshift(message);
    localStorage.setItem('messages', JSON.stringify(messages));
    await saveMessages();
    
    messageInput.value = '';
    updateUI();
    alert('留言发布成功');
}

function displayMessages() {
    const messageListElement = document.getElementById('messageList');
    if (!messageListElement) return;
    
    messageListElement.innerHTML = '';
    
    messages.forEach((message, index) => {
        if (message.deleted) return;
        
        const messageItem = document.createElement('div');
        messageItem.className = 'message-item';
        
        let deleteButton = '';
        if (message.code === currentUser.code) {
            deleteButton = `<button class="delete-message-btn" onclick="deleteMessage(${index})">删除</button>`;
        }
        
        const avatarUrl = getUserAvatar(message.code);
        
        messageItem.innerHTML = `
            <div class="message-item-header">
                <div class="message-item-header-left">
                    <div class="message-avatar" style="background-image: url('${avatarUrl}')"></div>
                    <strong>${message.name}</strong>
                </div>
                <span>${message.time}</span>
            </div>
            <div class="message-item-content">${message.content}</div>
            <div class="message-item-actions">${deleteButton}</div>
        `;
        messageListElement.appendChild(messageItem);
    });
}

async function deleteMessage(index) {
    if (confirm('确定要删除这条留言吗？')) {
        const message = messages[index];
        
        if (message.code === currentUser.code) {
            let pointsCost = 0;
            switch (currentUser.level) {
                case 'Ⅰ':
                    pointsCost = 0;
                    break;
                case 'Ⅱ':
                    pointsCost = 5;
                    break;
                case 'Ⅲ':
                    pointsCost = 5;
                    break;
            }
            
            if (pointsCost > 0) {
                currentUser.points += pointsCost;
            }
        }
        
        messages[index].deleted = true;
        await saveMessages();
        displayMessages();
        await recalculateMonthlyMessageCount();
        await saveUserState();
        updateUI();
    }
}

async function saveMessages() {
    localStorage.setItem('messages', JSON.stringify(messages));
    
    if (config && config.jsonbin && config.jsonbin.apiKey && config.jsonbin.bins && config.jsonbin.bins.messages) {
        try {
            const dataToSave = {
                messages: messages
            };
            
            console.log('保存留言到JSONBin，总数据大小:', JSON.stringify(dataToSave).length, '字节');
            
            const response = await fetch(`${config.jsonbin.apiUrl}/${config.jsonbin.bins.messages}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': config.jsonbin.apiKey
                },
                body: JSON.stringify(dataToSave)
            });
            
            if (response.ok) {
                console.log('留言保存到JSONBin成功');
            } else {
                console.error('保存留言到JSONBin失败');
            }
        } catch (error) {
            console.error('保存留言到JSONBin失败:', error);
        }
    }
}

async function saveVotes() {
    localStorage.setItem('votes', JSON.stringify(votes));
    
    if (config && config.jsonbin && config.jsonbin.apiKey && config.jsonbin.bins && config.jsonbin.bins.votes) {
        try {
            const dataToSave = {
                votes: votes
            };
            
            console.log('保存投票到JSONBin，总数据大小:', JSON.stringify(dataToSave).length, '字节');
            
            const response = await fetch(`${config.jsonbin.apiUrl}/${config.jsonbin.bins.votes}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': config.jsonbin.apiKey
                },
                body: JSON.stringify(dataToSave)
            });
            
            if (response.ok) {
                console.log('投票保存到JSONBin成功');
            } else {
                console.error('保存投票到JSONBin失败');
            }
        } catch (error) {
            console.error('保存投票到JSONBin失败:', error);
        }
    }
}

async function updateMessageCount() {
    await recalculateMonthlyMessageCount();
    updateUI();
}

async function createVote() {
    const titleInput = document.getElementById('voteTitle');
    const optionsContainer = document.getElementById('voteOptionsContainer');
    
    const title = titleInput.value.trim();
    const optionInputs = optionsContainer.querySelectorAll('.vote-option-input');
    const options = Array.from(optionInputs).map(input => input.value.trim()).filter(o => o);
    
    if (!title) {
        alert('请输入投票标题');
        return;
    }
    
    if (options.length < 2) {
        alert('请至少输入2个选项');
        return;
    }
    
    if (currentUser.level !== 'Ⅰ') {
        alert('只有Ⅰ级用户可以发起投票');
        return;
    }
    
    if (currentUser.points < 50) {
        alert('积分不足，需要50积分');
        return;
    }
    
    currentUser.points -= 50;
    
    const now = new Date();
    const expireTime = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const vote = {
        id: Date.now(),
        title: title,
        options: options.map((opt, index) => ({
            id: index,
            text: opt,
            votes: 0,
            voters: []
        })),
        creator: currentUser.code,
        creatorName: currentUser.name,
        createTime: now.toISOString(),
        expireTime: expireTime.toISOString(),
        settleTime: null,
        status: 'active',
        votedUsers: []
    };
    
    votes.unshift(vote);
    localStorage.setItem('votes', JSON.stringify(votes));
    await saveVotes();
    
    await saveUserState();
    titleInput.value = '';
    
    optionInputs.forEach(input => {
        input.value = '';
    });
    
    updateUI();
    alert('投票创建成功');
}

function addVoteOption() {
    const container = document.getElementById('voteOptionsContainer');
    const optionCount = container.querySelectorAll('.vote-option-item').length;
    
    if (optionCount >= 10) {
        alert('最多只能添加10个选项');
        return;
    }
    
    const optionDiv = document.createElement('div');
    optionDiv.className = 'vote-option-item';
    optionDiv.innerHTML = `<input type="text" class="vote-option-input" placeholder="选项${optionCount + 1}">`;
    container.appendChild(optionDiv);
    
    updateRemoveOptionButton();
}

function removeVoteOption() {
    const container = document.getElementById('voteOptionsContainer');
    const options = container.querySelectorAll('.vote-option-item');
    
    if (options.length <= 2) {
        alert('至少需要保留2个选项');
        return;
    }
    
    container.removeChild(options[options.length - 1]);
    updateRemoveOptionButton();
}

function updateRemoveOptionButton() {
    const container = document.getElementById('voteOptionsContainer');
    const removeButton = document.getElementById('removeOptionButton');
    const optionCount = container.querySelectorAll('.vote-option-item').length;
    
    removeButton.disabled = optionCount <= 2;
}

async function displayVotes() {
    const voteListElement = document.getElementById('voteList');
    if (!voteListElement) return;
    
    voteListElement.innerHTML = '';
    
    for (const vote of votes) {
        if (vote.status !== 'active' && vote.status !== 'settled' && vote.status !== 'expired' && vote.status !== 'closed') continue;
        
        const now = new Date();
        const expireTime = new Date(vote.expireTime);
        const isExpired = now > expireTime;
        
        if (isExpired && vote.status === 'active') {
            vote.status = 'expired';
            localStorage.setItem('votes', JSON.stringify(votes));
            await saveVotes();
            continue;
        }
        
        if (vote.status === 'settled' && vote.settleTime) {
            const settleTime = new Date(vote.settleTime);
            const weekLater = new Date(settleTime.getTime() + 7 * 24 * 60 * 60 * 1000);
            if (now > weekLater) {
                continue;
            }
        }
        
        if (vote.status === 'expired') {
            const expireTime = new Date(vote.expireTime);
            const weekLater = new Date(expireTime.getTime() + 7 * 24 * 60 * 60 * 1000);
            if (now > weekLater) {
                continue;
            }
        }
        
        if (vote.status === 'closed') {
            if (vote.vetoedTime) {
                const vetoedTime = new Date(vote.vetoedTime);
                const weekLater = new Date(vetoedTime.getTime() + 7 * 24 * 60 * 60 * 1000);
                if (now > weekLater) {
                    continue;
                }
            } else {
                const closeTime = vote.closeTime ? new Date(vote.closeTime) : new Date();
                const weekLater = new Date(closeTime.getTime() + 7 * 24 * 60 * 60 * 1000);
                if (now > weekLater) {
                    continue;
                }
            }
        }
        
        const voteItem = document.createElement('div');
        voteItem.className = 'vote-item';
        voteItem.id = `vote-${vote.id}`;
        
        const isCreator = vote.creator === currentUser.code;
        const hasVoted = vote.votedUsers.includes(currentUser.code);
        const totalVotes = vote.options.reduce((sum, opt) => sum + opt.votes, 0);
        
        let optionsHtml = '';
        vote.options.forEach((option, index) => {
            const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
            optionsHtml += `
                <div class="vote-option">
                    <input type="radio" name="vote-${vote.id}" value="${index}" id="vote-${vote.id}-option-${index}" ${hasVoted || vote.status !== 'active' ? 'disabled' : ''}>
                    <label for="vote-${vote.id}-option-${index}">${option.text} (${option.votes}票, ${percentage}%)</label>
                </div>
            `;
        });
        
        let statusText = '';
        if (vote.status === 'active') {
            statusText = '进行中';
        } else if (vote.status === 'settled') {
            statusText = '已结算';
        } else if (vote.status === 'expired') {
            statusText = '已过期';
        } else if (vote.status === 'closed') {
            if (vote.vetoedBy) {
                statusText = `已否决（${vote.vetoedByName}）`;
            } else {
                statusText = '已关闭';
            }
        }
        
        voteItem.innerHTML = `
            <div class="vote-item-header">
                <div>
                    <h4>${vote.title}</h4>
                    <span>发起人: ${vote.creatorName} | ${new Date(vote.createTime).toLocaleString()}</span>
                </div>
                <span>状态: ${statusText}</span>
            </div>
            <div class="vote-options">
                ${optionsHtml}
            </div>
            <div class="vote-actions">
                ${!hasVoted && vote.status === 'active' ? `<button class="btn btn-primary" onclick="voteFor(${vote.id})">投票</button>` : ''}
                ${!hasVoted && vote.status === 'active' ? `<button class="btn btn-secondary" onclick="abstainVote(${vote.id})">弃票</button>` : ''}
                ${isCreator && vote.status === 'active' ? `<button class="btn btn-secondary" onclick="closeVote(${vote.id})">关闭投票</button>` : ''}
                ${isCreator && vote.status === 'active' ? `<button class="btn btn-primary" onclick="settleVote(${vote.id})">结算投票</button>` : ''}
                ${isCreator && vote.status === 'settled' ? `<button class="btn btn-secondary" onclick="clearVoteResult(${vote.id})">清除结果</button>` : ''}
                ${isCreator && (vote.status === 'closed' || vote.status === 'expired') ? `<button class="btn btn-danger" onclick="deleteVote(${vote.id})">删除投票</button>` : ''}
                ${currentUser.level === 'Ⅰ' && vote.status === 'active' && !isCreator ? `<button class="btn btn-danger" onclick="vetoVote(${vote.id})">一票否决（消耗25积分）</button>` : ''}
            </div>
        `;
        
        voteListElement.appendChild(voteItem);
    }
}

async function voteFor(voteId) {
    const vote = votes.find(v => v.id === voteId);
    if (!vote) return;
    
    if (vote.status !== 'active') {
        alert('投票已结束');
        return;
    }
    
    if (vote.votedUsers.includes(currentUser.code)) {
        alert('您已经投过票了');
        return;
    }
    
    const selectedOption = document.querySelector(`input[name="vote-${voteId}"]:checked`);
    if (!selectedOption) {
        alert('请选择一个选项');
        return;
    }
    
    const optionIndex = parseInt(selectedOption.value);
    vote.options[optionIndex].votes++;
    vote.options[optionIndex].voters.push(currentUser.code);
    vote.votedUsers.push(currentUser.code);
    
    const allUsersVoted = vote.votedUsers.length === allUsers.length;
    if (allUsersVoted) {
        const maxVotes = Math.max(...vote.options.map(opt => opt.votes));
        const winners = vote.options.filter(opt => opt.votes === maxVotes);
        
        if (winners.length === 1) {
            alert(`所有人员已投票！自动结算完成！获胜选项: ${winners[0].text}`);
        } else {
            const winnerText = winners.map(w => w.text).join(', ');
            alert(`所有人员已投票！自动结算完成！平局选项: ${winnerText}`);
        }
        
        vote.status = 'settled';
        vote.settleTime = new Date().toISOString();
    }
    
    localStorage.setItem('votes', JSON.stringify(votes));
    await saveVotes();
    displayVotes();
    if (!allUsersVoted) {
        alert('投票成功');
    }
}

async function abstainVote(voteId) {
    const vote = votes.find(v => v.id === voteId);
    if (!vote) return;
    
    if (vote.status !== 'active') {
        alert('投票已结束');
        return;
    }
    
    if (vote.votedUsers.includes(currentUser.code)) {
        alert('您已经投过票了');
        return;
    }
    
    vote.votedUsers.push(currentUser.code);
    
    const allUsersVoted = vote.votedUsers.length === allUsers.length;
    if (allUsersVoted) {
        const maxVotes = Math.max(...vote.options.map(opt => opt.votes));
        const winners = vote.options.filter(opt => opt.votes === maxVotes);
        
        if (winners.length === 1) {
            alert(`所有人员已投票！自动结算完成！获胜选项: ${winners[0].text}`);
        } else {
            const winnerText = winners.map(w => w.text).join(', ');
            alert(`所有人员已投票！自动结算完成！平局选项: ${winnerText}`);
        }
        
        vote.status = 'settled';
        vote.settleTime = new Date().toISOString();
    }
    
    localStorage.setItem('votes', JSON.stringify(votes));
    await saveVotes();
    displayVotes();
    if (!allUsersVoted) {
        alert('弃票成功');
    }
}

async function closeVote(voteId) {
    const vote = votes.find(v => v.id === voteId);
    if (!vote) return;
    
    if (vote.creator !== currentUser.code) {
        alert('只有发起人可以关闭投票');
        return;
    }
    
    vote.status = 'closed';
    vote.closeTime = new Date().toISOString();
    localStorage.setItem('votes', JSON.stringify(votes));
    await saveVotes();
    displayVotes();
    alert('投票已关闭');
}

async function settleVote(voteId) {
    const vote = votes.find(v => v.id === voteId);
    if (!vote) return;
    
    if (vote.creator !== currentUser.code) {
        alert('只有发起人可以结算投票');
        return;
    }
    
    const level1Users = allUsers.filter(u => u.level === 'Ⅰ');
    const level1VotedUsers = vote.votedUsers.filter(code => {
        const user = allUsers.find(u => u.code === code);
        return user && user.level === 'Ⅰ';
    });
    
    const totalVotes = vote.votedUsers.length;
    const canSettle = level1Users.length < 3 ? totalVotes >= 3 : level1VotedUsers.length === level1Users.length;
    
    if (!canSettle) {
        if (level1Users.length < 3) {
            alert(`投票人数不足3人，当前${totalVotes}人，无法结算`);
        } else {
            alert(`Ⅰ级人员未全部投票，当前${level1VotedUsers.length}/${level1Users.length}人，无法结算`);
        }
        return;
    }
    
    const maxVotes = Math.max(...vote.options.map(opt => opt.votes));
    const winners = vote.options.filter(opt => opt.votes === maxVotes);
    
    if (winners.length === 1) {
        alert(`投票结算完成！获胜选项: ${winners[0].text}`);
    } else {
        const winnerText = winners.map(w => w.text).join(', ');
        alert(`投票结算完成！平局选项: ${winnerText}`);
    }
    
    vote.status = 'settled';
    vote.settleTime = new Date().toISOString();
    localStorage.setItem('votes', JSON.stringify(votes));
    await saveVotes();
    displayVotes();
}

async function clearVoteResult(voteId) {
    const vote = votes.find(v => v.id === voteId);
    if (!vote) return;
    
    if (vote.creator !== currentUser.code) {
        alert('只有发起人可以清除投票结果');
        return;
    }
    
    if (vote.status !== 'settled') {
        alert('只能清除已结算的投票结果');
        return;
    }
    
    if (confirm('确定要清除投票结果吗？')) {
        vote.status = 'closed';
        vote.settleTime = null;
        localStorage.setItem('votes', JSON.stringify(votes));
        await saveVotes();
        displayVotes();
        alert('投票结果已清除');
    }
}

async function vetoVote(voteId) {
    const vote = votes.find(v => v.id === voteId);
    if (!vote) return;
    
    if (currentUser.level !== 'Ⅰ') {
        alert('只有Ⅰ级人员可以使用一票否决');
        return;
    }
    
    if (vote.status !== 'active') {
        alert('只能对进行中的投票使用一票否决');
        return;
    }
    
    if (currentUser.points < 25) {
        alert('积分不足，需要25积分');
        return;
    }
    
    if (confirm('确定一票否决吗？')) {
        currentUser.points -= 25;
        vote.status = 'closed';
        vote.vetoedBy = currentUser.code;
        vote.vetoedByName = currentUser.name;
        vote.vetoedTime = new Date().toISOString();
        
        localStorage.setItem('votes', JSON.stringify(votes));
        await saveVotes();
        await saveUserState();
        displayVotes();
        updateUI();
        alert('一票否决成功，投票已关闭');
    }
}

async function deleteVote(voteId) {
    const voteIndex = votes.findIndex(v => v.id === voteId);
    if (voteIndex === -1) return;
    
    const vote = votes[voteIndex];
    
    if (vote.creator !== currentUser.code) {
        alert('只有发起人可以删除投票');
        return;
    }
    
    if (vote.status === 'active') {
        alert('只能删除已关闭的投票');
        return;
    }
    
    if (confirm('确定要删除这个投票吗？删除后无法恢复！')) {
        votes.splice(voteIndex, 1);
        localStorage.setItem('votes', JSON.stringify(votes));
        await saveVotes();
        displayVotes();
        alert('投票已删除并同步到所有设备');
    }
}

function displayMembers() {
    const membersGridElement = document.getElementById('membersGrid');
    if (!membersGridElement) return;
    
    membersGridElement.innerHTML = '';
    
    const sortedUsers = [...allUsers].sort((a, b) => {
        const aHasComment = a.comment && a.comment.trim() !== '';
        const bHasComment = b.comment && b.comment.trim() !== '';
        if (aHasComment && !bHasComment) return 1;
        if (!aHasComment && bHasComment) return -1;
        return 0;
    });
    
    sortedUsers.forEach(user => {
        const memberCard = document.createElement('div');
        memberCard.className = 'member-card';
        
        let savedAvatar = avatars[user.code];
        if (!savedAvatar) {
            savedAvatar = localStorage.getItem(`avatar_${user.code}`);
        }
        let avatarHtml = '';
        if (savedAvatar) {
            avatarHtml = `<img src="${savedAvatar}" alt="${user.name}">`;
        } else {
            avatarHtml = user.code.charAt(0).toUpperCase();
        }
        
        let commentHtml = '';
        if (user.comment && user.comment.trim() !== '') {
            commentHtml = `<p class="member-comment">${user.comment}</p>`;
        }
        
        memberCard.innerHTML = `
            <div class="avatar">${avatarHtml}</div>
            <h4>${user.name}</h4>
            <p>代号: ${user.code}</p>
            <p>等级: ${user.level}</p>
            <p>性别: ${user.gender}</p>
            <p>籍贯: ${user.nativePlace}</p>
            <p>职位: ${user.position || '无'}</p>
            ${commentHtml}
        `;
        
        membersGridElement.appendChild(memberCard);
    });
}

function displayProfile() {
    if (!currentUser) return;
    
    const nameElement = document.getElementById('profileName');
    const codeElement = document.getElementById('profileCode');
    const genderElement = document.getElementById('profileGender');
    const levelElement = document.getElementById('profileLevel');
    const nativePlaceElement = document.getElementById('profileNativePlace');
    const positionElement = document.getElementById('profilePosition');
    const pointsElement = document.getElementById('profilePoints');
    const passwordStatusElement = document.getElementById('passwordStatus');
    const oldPasswordGroup = document.getElementById('oldPasswordGroup');
    
    if (nameElement) nameElement.textContent = currentUser.name;
    if (codeElement) codeElement.textContent = currentUser.code;
    if (genderElement) genderElement.textContent = currentUser.gender;
    if (levelElement) levelElement.textContent = currentUser.level;
    if (nativePlaceElement) nativePlaceElement.textContent = currentUser.nativePlace;
    if (positionElement) positionElement.textContent = currentUser.position || '无';
    if (pointsElement) pointsElement.textContent = currentUser.points;
    
    if (passwordStatusElement) {
        if (passwords[currentUser.code]) {
            passwordStatusElement.textContent = '已设置';
        } else {
            passwordStatusElement.textContent = '未设置';
        }
    }
    
    if (oldPasswordGroup) {
        if (passwords[currentUser.code]) {
            oldPasswordGroup.style.display = 'block';
        } else {
            oldPasswordGroup.style.display = 'none';
        }
    }
    
    updateAvatar();
}

function uploadAvatar(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        alert('请选择图片文件');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        const imageData = e.target.result;
        localStorage.setItem(`avatar_${currentUser.code}`, imageData);
        await saveAvatar(currentUser.code, imageData);
        updateAvatar();
        alert('头像上传成功并已同步到所有设备');
    };
    reader.readAsDataURL(file);
}

async function deleteAvatar() {
    if (!confirm('确定要删除头像吗？删除后无法恢复！')) {
        return;
    }
    
    delete avatars[currentUser.code];
    localStorage.removeItem(`avatar_${currentUser.code}`);
    
    if (config && config.jsonbin && config.jsonbin.apiKey && config.jsonbin.bins && config.jsonbin.bins.avatars) {
        try {
            const dataToSave = {
                avatars: avatars
            };
            
            const response = await fetch(`${config.jsonbin.apiUrl}/${config.jsonbin.bins.avatars}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': config.jsonbin.apiKey
                },
                body: JSON.stringify(dataToSave)
            });
            
            if (response.ok) {
                console.log('头像删除并同步到JSONBin成功');
                alert('头像已删除并同步到所有设备');
            } else {
                console.error('同步到JSONBin失败');
                alert('头像删除成功，但同步失败');
            }
        } catch (error) {
            console.error('同步到JSONBin失败:', error);
            alert('头像删除成功，但同步失败');
        }
    }
    
    updateAvatar();
}

async function changePassword() {
    const oldPassword = document.getElementById('oldPassword').value.trim();
    const newPassword = document.getElementById('newPassword').value.trim();
    const confirmPassword = document.getElementById('confirmPassword').value.trim();
    
    const currentPassword = passwords[currentUser.code];
    
    if (currentPassword) {
        if (!oldPassword) {
            alert('请输入旧密码');
            return;
        }
        
        if (oldPassword !== currentPassword) {
            alert('旧密码错误');
            return;
        }
    } else {
        if (oldPassword) {
            alert('该账号未设置密码，请留空旧密码框');
            return;
        }
    }
    
    if (!newPassword) {
        if (!confirm('确定要设置为无密码吗？')) {
            return;
        }
        delete passwords[currentUser.code];
        await savePasswords();
        localStorage.removeItem(`knownDevices_${currentUser.code}`);
        document.getElementById('oldPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
        displayProfile();
        alert('已设置为无密码！');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        alert('两次输入的密码不一致');
        return;
    }
    
    if (newPassword.length < 4) {
        alert('密码长度至少为4位');
        return;
    }
    
    if (currentPassword && oldPassword === newPassword) {
        alert('新密码不能与旧密码相同');
        return;
    }
    
    await savePassword(currentUser.code, newPassword);
    
    localStorage.removeItem(`knownDevices_${currentUser.code}`);
    
    document.getElementById('oldPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    
    displayProfile();
    alert('密码修改成功！所有设备需要重新验证。');
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    const menuBtn = document.querySelector('.mobile-menu-btn');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
    if (menuBtn) {
        menuBtn.style.display = sidebar.classList.contains('active') ? 'none' : '';
    }
}

function closeSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    const menuBtn = document.querySelector('.mobile-menu-btn');
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
    if (menuBtn) {
        menuBtn.style.display = '';
    }
}

function setActiveNav(page) {
    const navLinks = document.querySelectorAll('.sidebar nav ul li a');
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === page) {
            link.classList.add('active');
        }
    });
}

function checkLogin() {
    if (!currentUser) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}