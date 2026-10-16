const uuid = (s) => typeof s === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(s);
const safeHeaders = { 'Cache-Control': 'no-store, private', 'Pragma': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow, noarchive' };
const reply = (data, status = 200) => Response.json(data, { status, headers: safeHeaders });
export async function handleSecureApi(req, db) {
    const url = new URL(req.url);
    const token = req.headers.get('authorization')?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];
    if (!token)
        return reply({ error: '缺少访问凭证，请使用完整的分享链接' }, 401);
    if (req.method !== 'GET' && req.method !== 'POST')
        return reply({ error: 'Method not allowed' }, 405);
    let body = {};
    if (req.method === 'POST') {
        if (req.headers.get('origin') && req.headers.get('origin') !== url.origin)
            return reply({ error: '禁止跨站请求' }, 403);
        if (!req.headers.get('content-type')?.startsWith('application/json'))
            return reply({ error: '需要 JSON 请求' }, 415);
        const text = await req.text();
        if (text.length > 16000)
            return reply({ error: '请求过大' }, 413);
        try {
            const raw = JSON.parse(text);
            if (!raw || Array.isArray(raw) || typeof raw !== 'object')
                throw Error();
            body = raw;
        }
        catch {
            return reply({ error: '无效请求' }, 400);
        }
    }
    const room = req.method === 'GET' ? url.searchParams.get('room') : body.room;
    if (!uuid(room))
        return reply({ error: '无效的清单链接' }, 400);
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))), b => b.toString(16).padStart(2, '0')).join('');
    if (url.pathname === '/api/rooms') {
        if (req.method !== 'POST')
            return reply({ error: 'Method not allowed' }, 405);
        try {
            await db.prepare('INSERT INTO private_rooms (id,token_hash,created) VALUES (?,?,?)').bind(room, hash, Date.now()).run();
            return reply({ ok: true }, 201);
        }
        catch {
            return reply({ error: '无法创建清单，请重试' }, 409);
        }
    }
    if (url.pathname !== '/api/items')
        return reply({ error: 'Not found' }, 404);
    const grant = await db.prepare('SELECT token_hash FROM private_rooms WHERE id=?').bind(room).first();
    if (!grant || grant.token_hash !== hash)
        return reply({ error: '此链接无效，或你没有访问权限' }, 403);
    if (req.method === 'GET') {
        const rows = await db.prepare('SELECT id,data,iv,revision FROM encrypted_items WHERE room=? ORDER BY created DESC').bind(room).all();
        return reply(rows.results);
    }
    if (!uuid(body.id))
        return reply({ error: '无效事项' }, 400);
    if (body.action === 'delete') {
        if (!Number.isSafeInteger(body.revision))
            return reply({ error: '缺少事项版本' }, 400);
        const result = await db.prepare('DELETE FROM encrypted_items WHERE id=? AND room=? AND revision=?').bind(body.id, room, body.revision).run();
        return result.meta?.changes ? reply({ ok: true }) : reply({ error: '事项已更新，请同步后重试' }, 409);
    }
    if (typeof body.data !== 'string' || body.data.length < 24 || body.data.length > 12000 || !/^[A-Za-z0-9_-]+$/.test(body.data) || typeof body.iv !== 'string' || !/^[A-Za-z0-9_-]{16}$/.test(body.iv))
        return reply({ error: '无效的加密内容' }, 400);
    if (body.action === 'add') {
        const count = await db.prepare('SELECT COUNT(*) AS n FROM encrypted_items WHERE room=?').bind(room).first();
        if ((count?.n || 0) >= 1000)
            return reply({ error: '当前清单最多保存 1000 条事项' }, 400);
        try {
            await db.prepare('INSERT INTO encrypted_items (id,room,data,iv,revision,created) VALUES (?,?,?,?,0,?)').bind(body.id, room, body.data, body.iv, Date.now()).run();
            return reply({ ok: true }, 201);
        }
        catch {
            return reply({ error: '事项已存在' }, 409);
        }
    }
    if (body.action === 'update' && Number.isSafeInteger(body.revision)) {
        const result = await db.prepare('UPDATE encrypted_items SET data=?,iv=?,revision=revision+1 WHERE id=? AND room=? AND revision=?').bind(body.data, body.iv, body.id, room, body.revision).run();
        return result.meta?.changes ? reply({ ok: true }) : reply({ error: '事项已更新，请同步后重试' }, 409);
    }
    return reply({ error: '无效操作' }, 400);
}
