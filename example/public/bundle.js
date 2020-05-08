
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.22.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/index.svelte generated by Svelte v3.22.2 */

    const { Object: Object_1, document: document_1 } = globals;
    const file = "src/index.svelte";

    function add_css() {
    	var style = element("style");
    	style.id = "svelte-thjvuk-style";
    	style.textContent = ".crop-img.svelte-thjvuk.svelte-thjvuk{width:450px;height:300px;overflow:hidden;background:#f5f5f5}.crop-wrap.svelte-thjvuk.svelte-thjvuk{position:relative;margin:auto;box-sizing:border-box;background:#ccc}.crop-wrap.svelte-thjvuk img.svelte-thjvuk{width:100%;height:100%}.crop-box.svelte-thjvuk.svelte-thjvuk{position:absolute;z-index:2}.crop-box__move.svelte-thjvuk.svelte-thjvuk{width:100%;height:100%;border:2px solid rgba(255, 255, 255, 0.6);box-sizing:border-box;background:rgba(0, 0, 0, 0);cursor:move}.crop-box.svelte-thjvuk .zoom-box.svelte-thjvuk{position:absolute;right:-3px;bottom:-3px;width:5px;height:5px;background:#ffffff;cursor:se-resize}.cover-wrap.svelte-thjvuk.svelte-thjvuk{position:absolute;top:0;left:0;width:100%;height:100%;background:transparent;z-index:1}.cover-box.svelte-thjvuk.svelte-thjvuk{position:absolute;top:0;height:100%;background-color:rgba(0, 0, 0, 0.5)}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguc3ZlbHRlIiwic291cmNlcyI6WyJpbmRleC5zdmVsdGUiXSwic291cmNlc0NvbnRlbnQiOlsiPHNjcmlwdCBsYW5nPVwidHNcIj5pbXBvcnQgeyBvbk1vdW50LCBvbkRlc3Ryb3ksIGNyZWF0ZUV2ZW50RGlzcGF0Y2hlciB9IGZyb20gXCJzdmVsdGVcIjtcbmV4cG9ydCBsZXQgc3JjO1xuZXhwb3J0IGxldCB3aWR0aDtcbmV4cG9ydCBsZXQgaGVpZ2h0O1xuY29uc3QgZGlzcGF0Y2ggPSBjcmVhdGVFdmVudERpc3BhdGNoZXIoKTtcbmNvbnN0IE1JTl9DUk9QX1NJWkUgPSAxMDA7XG5jb25zdCBERUZBVUxUX0NST1BfQk9YID0ge1xuICAgIHRvcDogMjMsXG4gICAgbGVmdDogNDAsXG4gICAgd2lkdGg6IDE1MCxcbiAgICBoZWlnaHQ6IDE1MCxcbiAgICB4OiAwLFxuICAgIHk6IDAsXG4gICAgaXNNb3ZlOiBmYWxzZVxufTtcbmxldCBpbWdTcmMgPSBcIlwiO1xubGV0IGltZ0RhdGEgPSBcIlwiO1xubGV0IG1pblNpemUgPSBNSU5fQ1JPUF9TSVpFO1xubGV0IGVsV3JhcDtcbi8vIOaVtOS9k+WuueWZqFxubGV0IGNvbnRhaW5lciA9IHtcbiAgICB3aWR0aDogd2lkdGggfHwgNDUwLFxuICAgIGhlaWdodDogaGVpZ2h0IHx8IDMwMFxufTtcbi8vIOijgeWJquWuueWZqFxubGV0IHdyYXBCb3ggPSB7XG4gICAgdG9wOiAwLFxuICAgIHdpZHRoOiAwLFxuICAgIGhlaWdodDogMCxcbiAgICB4OiAwLFxuICAgIHk6IDBcbn07XG4vLyDljp/lm77niYdcbmxldCBvcmlnaW5JbWcgPSBudWxsO1xuLy8g5Zu+54mH5bGe5oCnXG5sZXQgc2NhbGUgPSB7XG4gICAgd2lkdGg6IDAsXG4gICAgaGVpZ2h0OiAwLFxuICAgIHJhdGlvOiAxXG59O1xuLy8g6aKE6KeI5Z2XXG5sZXQgY3JvcEJveCA9IE9iamVjdC5hc3NpZ24oe30sIERFRkFVTFRfQ1JPUF9CT1gpO1xuLy8g57yp5pS+5Z2XXG5sZXQgem9vbUJveCA9IHtcbiAgICB4OiAwLFxuICAgIHk6IDAsXG4gICAgaXNNb3ZlOiBmYWxzZVxufTtcbi8vIOmYtOW9semBrue9qeWdl1xubGV0IGNvdmVyQm94cyA9IFtcbiAgICB7IGxlZnQ6IFwiMFwiLCB3aWR0aDogXCIwXCIsIGhlaWdodDogXCIwXCIgfSxcbiAgICB7IGxlZnQ6IFwiMFwiLCB3aWR0aDogXCIwXCIgfSxcbiAgICB7IHRvcDogXCIwXCIsIGxlZnQ6IFwiMFwiLCB3aWR0aDogXCIwXCIsIGhlaWdodDogXCIwXCIgfSxcbiAgICB7IHdpZHRoOiBcIjBcIiB9IC8vIGxlZnQ6XG5dO1xuJDogd3JhcFN0eWxlID0gYFxuICAgIHdpZHRoOiAke3dyYXBCb3gud2lkdGh9cHg7XG4gICAgaGVpZ2h0OiAke3dyYXBCb3guaGVpZ2h0fXB4O1xuICAgIG1hcmdpbi10b3A6ICR7d3JhcEJveC50b3B9cHg7YDtcbiQ6IGNyb3BCb3hTdHlsZSA9IGBcbiAgICB0b3A6ICR7Y3JvcEJveC50b3B9cHg7XG4gICAgbGVmdDogJHtjcm9wQm94LmxlZnR9cHg7XG4gICAgd2lkdGg6ICR7Y3JvcEJveC53aWR0aH1weDtcbiAgICBoZWlnaHQ6ICR7Y3JvcEJveC5oZWlnaHR9cHg7XG4gIGA7XG4kOiBzdGFydChzcmMpO1xuLy8g6K6+572u6KOB5Ymq5a655Zmo5aSn5bCP5L2N572uXG5mdW5jdGlvbiBzZXRXcmFwQm94KCkge1xuICAgIGlmICghc2NhbGUud2lkdGggfHwgIXNjYWxlLmhlaWdodClcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgbGV0IHdpZHRoLCBoZWlnaHQsIHRvcCA9IDA7XG4gICAgaWYgKHNjYWxlLndpZHRoID4gc2NhbGUuaGVpZ2h0KSB7XG4gICAgICAgIHdpZHRoID0gY29udGFpbmVyLndpZHRoO1xuICAgICAgICBoZWlnaHQgPSBNYXRoLmZsb29yKChjb250YWluZXIud2lkdGggKiBzY2FsZS5oZWlnaHQpIC8gc2NhbGUud2lkdGgpO1xuICAgICAgICB0b3AgPSAoY29udGFpbmVyLmhlaWdodCAtIGhlaWdodCkgLyAyO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgd2lkdGggPSBNYXRoLmZsb29yKChjb250YWluZXIuaGVpZ2h0ICogc2NhbGUud2lkdGgpIC8gc2NhbGUuaGVpZ2h0KTtcbiAgICAgICAgaGVpZ2h0ID0gY29udGFpbmVyLmhlaWdodDtcbiAgICB9XG4gICAgd3JhcEJveCA9IE9iamVjdC5hc3NpZ24od3JhcEJveCwge1xuICAgICAgICB3aWR0aCxcbiAgICAgICAgaGVpZ2h0LFxuICAgICAgICB0b3A6IHRvcFxuICAgIH0pO1xuICAgIHNjYWxlLnJhdGlvID0gc2NhbGUud2lkdGggLyB3aWR0aDtcbn1cbi8vIOiuvue9ruijgeWJquWuueWZqOS9jee9rlxuZnVuY3Rpb24gc2V0V3JhcFBvc2l0aW9uKCkge1xuICAgIGxldCB4LCB5O1xuICAgIGNvbnN0IGVsID0gZWxXcmFwO1xuICAgIGlmIChlbCkge1xuICAgICAgICBjb25zdCByZWN0ID0gZWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgIHggPSByZWN0LnggfHwgcmVjdC5sZWZ0O1xuICAgICAgICB5ID0gcmVjdC55IHx8IHJlY3QudG9wO1xuICAgICAgICB3cmFwQm94ID0gT2JqZWN0LmFzc2lnbih3cmFwQm94LCB7XG4gICAgICAgICAgICB4LFxuICAgICAgICAgICAgeVxuICAgICAgICB9KTtcbiAgICB9XG59XG4vLyDorr7nva7pu5jorqToo4HliarmoYZcbmZ1bmN0aW9uIHNldERlZmF1bHRDcm9wKCkge1xuICAgIGNvbnN0IHNpemUgPSBNYXRoLm1pbih3cmFwQm94LndpZHRoLCB3cmFwQm94LmhlaWdodCk7XG4gICAgLy8g5Zu+54mH5Yqg6L295ZCO5bCP5LqO6buY6K6k5pyA5bCP5YC8XG4gICAgaWYgKHNpemUgPD0gbWluU2l6ZSkge1xuICAgICAgICBjcm9wQm94LndpZHRoID0gY3JvcEJveC5oZWlnaHQgPSBzaXplO1xuICAgICAgICBjcm9wQm94LnRvcCA9IGNyb3BCb3gubGVmdCA9IDA7XG4gICAgICAgIG1pblNpemUgPSBzaXplO1xuICAgIH1cbiAgICAvLyDlm77niYfliqDovb3lkI7lpKfkuo7pu5jorqTmnIDlsI/lgLwmJuWwj+S6jum7mOiupOijgeWJquahhlxuICAgIGVsc2UgaWYgKHNpemUgPiBtaW5TaXplICYmIHNpemUgPCBjcm9wQm94LmxlZnQgKyBjcm9wQm94LndpZHRoKSB7XG4gICAgICAgIGNyb3BCb3gud2lkdGggPSBjcm9wQm94LmhlaWdodCA9IG1pblNpemU7XG4gICAgICAgIGNyb3BCb3gudG9wID0gY3JvcEJveC5sZWZ0ID0gMDtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIGNyb3BCb3ggPSBPYmplY3QuYXNzaWduKHt9LCBERUZBVUxUX0NST1BfQk9YKTtcbiAgICAgICAgbWluU2l6ZSA9IE1JTl9DUk9QX1NJWkU7XG4gICAgfVxufVxuLy8g6K6+572u6Zi05b2x6YGu5oyh5Z2XXG5mdW5jdGlvbiBzZXRDb3ZlckJveCgpIHtcbiAgICBmdW5jdGlvbiBub25uZWdhdGl2ZSh2YWwpIHtcbiAgICAgICAgcmV0dXJuIHZhbCA8IDAgPyAwIDogdmFsO1xuICAgIH1cbiAgICBjb25zdCB0b3AgPSBjb3ZlckJveHNbMF0sIHJpZ2h0ID0gY292ZXJCb3hzWzFdLCBib3R0b20gPSBjb3ZlckJveHNbMl0sIGxlZnQgPSBjb3ZlckJveHNbM107XG4gICAgdG9wLmxlZnQgPSBib3R0b20ubGVmdCA9IGxlZnQud2lkdGggPSBjcm9wQm94LmxlZnQgKyBcInB4XCI7XG4gICAgdG9wLndpZHRoID0gYm90dG9tLndpZHRoID0gY3JvcEJveC53aWR0aCArIFwicHhcIjtcbiAgICB0b3AuaGVpZ2h0ID0gY3JvcEJveC50b3AgKyBcInB4XCI7XG4gICAgcmlnaHQubGVmdCA9IGNyb3BCb3gubGVmdCArIGNyb3BCb3gud2lkdGggKyBcInB4XCI7XG4gICAgcmlnaHQud2lkdGggPVxuICAgICAgICBub25uZWdhdGl2ZSh3cmFwQm94LndpZHRoIC0gY3JvcEJveC5sZWZ0IC0gY3JvcEJveC53aWR0aCkgKyBcInB4XCI7XG4gICAgYm90dG9tLnRvcCA9IGNyb3BCb3gudG9wICsgY3JvcEJveC5oZWlnaHQgKyBcInB4XCI7XG4gICAgYm90dG9tLmhlaWdodCA9XG4gICAgICAgIG5vbm5lZ2F0aXZlKHdyYXBCb3guaGVpZ2h0IC0gY3JvcEJveC50b3AgLSBjcm9wQm94LmhlaWdodCkgKyBcInB4XCI7XG4gICAgY292ZXJCb3hzWzBdID0gdG9wOyAvLyBmaXg6IOabtOaWsOinhuWbvui1i+WAvFxufVxuLy8g55Sf5oiQ6KOB5Ymq5ZCO5Zu+54mHXG5mdW5jdGlvbiBjcmVhdGVJbWcoKSB7XG4gICAgY29uc3QgY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKSwgY3R4ID0gY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcbiAgICBjYW52YXMud2lkdGggPSBjcm9wQm94LndpZHRoO1xuICAgIGNhbnZhcy5oZWlnaHQgPSBjcm9wQm94LmhlaWdodDtcbiAgICBjdHguZHJhd0ltYWdlKG9yaWdpbkltZywgLWNyb3BCb3gubGVmdCwgLWNyb3BCb3gudG9wLCB3cmFwQm94LndpZHRoLCB3cmFwQm94LmhlaWdodCk7XG4gICAgaW1nRGF0YSA9IGNhbnZhcy50b0RhdGFVUkwoKTtcbn1cbmZ1bmN0aW9uIGNyb3AoKSB7XG4gICAgY3JlYXRlSW1nKCk7XG4gICAgZGlzcGF0Y2goXCJjaGFuZ2VcIiwgaW1nRGF0YSk7XG59XG4vLyDoo4HliarmoYblvIDlp4vnp7vliqhcbmZ1bmN0aW9uIGNyb3BNb3ZlU3RhcnQoZSkge1xuICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICBjcm9wQm94LnggPSBlLnNjcmVlblg7XG4gICAgY3JvcEJveC55ID0gZS5zY3JlZW5ZO1xuICAgIGNyb3BCb3guaXNNb3ZlID0gdHJ1ZTtcbn1cbi8vIOijgeWJquahhuenu+WKqOe7k+adn1xuZnVuY3Rpb24gY3JvcE1vdmVFbmQoZSkge1xuICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICBjcm9wQm94LmlzTW92ZSA9IGZhbHNlO1xufVxuLy8g6KOB5Ymq5qGG56e75YqoXG5mdW5jdGlvbiBjcm9wTW92ZShlKSB7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGNvbnN0IHsgeCwgeSwgbGVmdCwgdG9wLCB3aWR0aCwgaGVpZ2h0LCBpc01vdmUgfSA9IGNyb3BCb3g7XG4gICAgaWYgKCFpc01vdmUpXG4gICAgICAgIHJldHVybjtcbiAgICBjb25zdCBleCA9IGUuc2NyZWVuWCwgZXkgPSBlLnNjcmVlblksIHJMZWZ0ID0gbGVmdCAtICh4IC0gZXgpLCByVG9wID0gdG9wIC0gKHkgLSBleSk7XG4gICAgY3JvcEJveC5sZWZ0ID1cbiAgICAgICAgckxlZnQgPj0gMCAmJiByTGVmdCA8PSB3cmFwQm94LndpZHRoIC0gd2lkdGggPyByTGVmdCA6IGNyb3BCb3gubGVmdDtcbiAgICBjcm9wQm94LnRvcCA9XG4gICAgICAgIHJUb3AgPj0gMCAmJiByVG9wIDw9IHdyYXBCb3guaGVpZ2h0IC0gaGVpZ2h0ID8gclRvcCA6IGNyb3BCb3gudG9wO1xuICAgIGNyb3BCb3gueCA9IGV4O1xuICAgIGNyb3BCb3gueSA9IGV5O1xuICAgIHNldENvdmVyQm94KCk7XG4gICAgY3JvcCgpO1xufVxuLy8g57yp5pS+5qGG5byA5aeL56e75YqoXG5mdW5jdGlvbiB6b29tTW92ZVN0YXJ0KGUpIHtcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgem9vbUJveC5pc01vdmUgPSB0cnVlO1xufVxuLy8g57yp5pS+5qGG56e75Yqo57uT5p2fXG5mdW5jdGlvbiB6b29tTW92ZUVuZChlKSB7XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIHpvb21Cb3guaXNNb3ZlID0gZmFsc2U7XG59XG4vLyDnvKnmlL7moYbnp7vliqhcbmZ1bmN0aW9uIHpvb21Nb3ZlKGUpIHtcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgY29uc3QgeyBpc01vdmUgfSA9IHpvb21Cb3gsIHsgbGVmdCwgdG9wIH0gPSBjcm9wQm94O1xuICAgIGlmICghaXNNb3ZlKVxuICAgICAgICByZXR1cm47XG4gICAgY29uc3QgZXggPSBlLmNsaWVudFgsIGV5ID0gZS5jbGllbnRZLCByV2lkdGggPSBleCAtIHdyYXBCb3gueCAtIGxlZnQsIHJIZWlnaHQgPSBleSAtIHdyYXBCb3gueSAtIHRvcCwgc2l6ZSA9IE1hdGgubWF4KHJXaWR0aCwgckhlaWdodCk7XG4gICAgaWYgKHNpemUgPj0gbWluU2l6ZSAmJlxuICAgICAgICBzaXplIDw9IE1hdGgubWluKHdyYXBCb3gud2lkdGggLSBsZWZ0LCB3cmFwQm94LmhlaWdodCAtIHRvcCkpIHtcbiAgICAgICAgY3JvcEJveC53aWR0aCA9IGNyb3BCb3guaGVpZ2h0ID0gTWF0aC5tYXgocldpZHRoLCBySGVpZ2h0KTtcbiAgICAgICAgc2V0Q292ZXJCb3goKTtcbiAgICAgICAgY3JvcCgpO1xuICAgIH1cbn1cbmZ1bmN0aW9uIG9iajJzdHlsZShvYmopIHtcbiAgICBjb25zdCBhcnIgPSBbXTtcbiAgICBPYmplY3Qua2V5cyhvYmopLmZvckVhY2goa2V5ID0+IHtcbiAgICAgICAgYXJyLnB1c2goYCR7a2V5fToke29ialtrZXldfWApO1xuICAgIH0pO1xuICAgIHJldHVybiBhcnIuam9pbihcIjtcIik7XG59XG5mdW5jdGlvbiBzdGFydChzcmMpIHtcbiAgICBpZiAoaW1nU3JjID09PSBzcmMpXG4gICAgICAgIHJldHVybjtcbiAgICBpbWdTcmMgPSBzcmM7XG4gICAgY29uc3QgaW1nID0gbmV3IEltYWdlKCk7XG4gICAgaW1nLnNyYyA9IGltZ1NyYztcbiAgICBpbWcuc2V0QXR0cmlidXRlKFwiY3Jvc3NPcmlnaW5cIiwgXCJBbm9ueW1vdXNcIik7XG4gICAgaW1nLm9ubG9hZCA9ICgpID0+IHtcbiAgICAgICAgb3JpZ2luSW1nID0gaW1nO1xuICAgICAgICBzY2FsZS53aWR0aCA9IGltZy53aWR0aDtcbiAgICAgICAgc2NhbGUuaGVpZ2h0ID0gaW1nLmhlaWdodDtcbiAgICAgICAgc2V0V3JhcEJveCgpO1xuICAgICAgICBzZXRXcmFwUG9zaXRpb24oKTtcbiAgICAgICAgc2V0RGVmYXVsdENyb3AoKTtcbiAgICAgICAgc2V0Q292ZXJCb3goKTtcbiAgICAgICAgY3JvcCgpO1xuICAgIH07XG59XG5vbk1vdW50KCgpID0+IHtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwibW91c2V1cFwiLCB6b29tTW92ZUVuZCk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlbW92ZVwiLCB6b29tTW92ZSk7XG59KTtcbm9uRGVzdHJveSgoKSA9PiB7XG4gICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1vdXNldXBcIiwgem9vbU1vdmVFbmQpO1xuICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJtb3VzZW1vdmVcIiwgem9vbU1vdmUpO1xufSk7XG48L3NjcmlwdD5cblxuPHN0eWxlIGxhbmc9XCJzY3NzXCI+LmNyb3AtaW1nIHtcbiAgd2lkdGg6IDQ1MHB4O1xuICBoZWlnaHQ6IDMwMHB4O1xuICBvdmVyZmxvdzogaGlkZGVuO1xuICBiYWNrZ3JvdW5kOiAjZjVmNWY1OyB9XG5cbi5jcm9wLXdyYXAge1xuICBwb3NpdGlvbjogcmVsYXRpdmU7XG4gIG1hcmdpbjogYXV0bztcbiAgYm94LXNpemluZzogYm9yZGVyLWJveDtcbiAgYmFja2dyb3VuZDogI2NjYzsgfVxuICAuY3JvcC13cmFwIGltZyB7XG4gICAgd2lkdGg6IDEwMCU7XG4gICAgaGVpZ2h0OiAxMDAlOyB9XG5cbi5jcm9wLWJveCB7XG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgei1pbmRleDogMjsgfVxuICAuY3JvcC1ib3hfX21vdmUge1xuICAgIHdpZHRoOiAxMDAlO1xuICAgIGhlaWdodDogMTAwJTtcbiAgICBib3JkZXI6IDJweCBzb2xpZCByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuNik7XG4gICAgYm94LXNpemluZzogYm9yZGVyLWJveDtcbiAgICBiYWNrZ3JvdW5kOiByZ2JhKDAsIDAsIDAsIDApO1xuICAgIGN1cnNvcjogbW92ZTsgfVxuICAuY3JvcC1ib3ggLnpvb20tYm94IHtcbiAgICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gICAgcmlnaHQ6IC0zcHg7XG4gICAgYm90dG9tOiAtM3B4O1xuICAgIHdpZHRoOiA1cHg7XG4gICAgaGVpZ2h0OiA1cHg7XG4gICAgYmFja2dyb3VuZDogI2ZmZmZmZjtcbiAgICBjdXJzb3I6IHNlLXJlc2l6ZTsgfVxuXG4uY292ZXItd3JhcCB7XG4gIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgdG9wOiAwO1xuICBsZWZ0OiAwO1xuICB3aWR0aDogMTAwJTtcbiAgaGVpZ2h0OiAxMDAlO1xuICBiYWNrZ3JvdW5kOiB0cmFuc3BhcmVudDtcbiAgei1pbmRleDogMTsgfVxuXG4uY292ZXItYm94IHtcbiAgcG9zaXRpb246IGFic29sdXRlO1xuICB0b3A6IDA7XG4gIGhlaWdodDogMTAwJTtcbiAgYmFja2dyb3VuZC1jb2xvcjogcmdiYSgwLCAwLCAwLCAwLjUpOyB9XG5cbi8qIyBzb3VyY2VNYXBwaW5nVVJMPWluZGV4LnN2ZWx0ZS5jc3MubWFwICovPC9zdHlsZT5cblxuPGRpdj5cbiAgPGRpdlxuICAgIGNsYXNzPVwiY3JvcC1pbWdcIlxuICAgIHN0eWxlPVwid2lkdGg6e2NvbnRhaW5lci53aWR0aH1weDtoZWlnaHQ6e2NvbnRhaW5lci5oZWlnaHR9cHhcIj5cbiAgICA8ZGl2IGNsYXNzPVwiY3JvcC13cmFwXCIgc3R5bGU9e3dyYXBTdHlsZX0gYmluZDp0aGlzPXtlbFdyYXB9PlxuICAgICAgeyNpZiBpbWdTcmN9XG4gICAgICAgIDxpbWcgc3JjPXtpbWdTcmN9IC8+XG4gICAgICB7L2lmfVxuXG4gICAgICA8IS0tIOijgeWJquaYvuekuuWuueWZqCAtLT5cbiAgICAgIDxkaXYgY2xhc3M9XCJjcm9wLWJveFwiIHN0eWxlPXtjcm9wQm94U3R5bGV9PlxuICAgICAgICA8ZGl2XG4gICAgICAgICAgY2xhc3M9XCJjcm9wLWJveF9fbW92ZVwiXG4gICAgICAgICAgb246bW91c2V1cD17Y3JvcE1vdmVFbmR9XG4gICAgICAgICAgb246bW91c2Vkb3duPXtjcm9wTW92ZVN0YXJ0fVxuICAgICAgICAgIG9uOm1vdXNlbW92ZT17Y3JvcE1vdmV9XG4gICAgICAgICAgb246bW91c2VvdXQ9e2Nyb3BNb3ZlRW5kfSAvPlxuICAgICAgICA8ZGl2IGNsYXNzPVwiem9vbS1ib3hcIiBvbjptb3VzZWRvd249e3pvb21Nb3ZlU3RhcnR9IC8+XG4gICAgICA8L2Rpdj5cbiAgICAgIDwhLS0g6Zi05b2x6YGu5oyh5Z2XIC0tPlxuICAgICAgPGRpdiBjbGFzcz1cImNvdmVyLXdyYXBcIj5cbiAgICAgICAgeyNlYWNoIGNvdmVyQm94cyBhcyBzdHlsZX1cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwiY292ZXItYm94XCIgc3R5bGU9e29iajJzdHlsZShzdHlsZSl9IC8+XG4gICAgICAgIHsvZWFjaH1cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICA8L2Rpdj5cbjwvZGl2PlxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQTRPbUIsU0FBUyw0QkFBQyxDQUFDLEFBQzVCLEtBQUssQ0FBRSxLQUFLLENBQ1osTUFBTSxDQUFFLEtBQUssQ0FDYixRQUFRLENBQUUsTUFBTSxDQUNoQixVQUFVLENBQUUsT0FBTyxBQUFFLENBQUMsQUFFeEIsVUFBVSw0QkFBQyxDQUFDLEFBQ1YsUUFBUSxDQUFFLFFBQVEsQ0FDbEIsTUFBTSxDQUFFLElBQUksQ0FDWixVQUFVLENBQUUsVUFBVSxDQUN0QixVQUFVLENBQUUsSUFBSSxBQUFFLENBQUMsQUFDbkIsd0JBQVUsQ0FBQyxHQUFHLGNBQUMsQ0FBQyxBQUNkLEtBQUssQ0FBRSxJQUFJLENBQ1gsTUFBTSxDQUFFLElBQUksQUFBRSxDQUFDLEFBRW5CLFNBQVMsNEJBQUMsQ0FBQyxBQUNULFFBQVEsQ0FBRSxRQUFRLENBQ2xCLE9BQU8sQ0FBRSxDQUFDLEFBQUUsQ0FBQyxBQUNiLGVBQWUsNEJBQUMsQ0FBQyxBQUNmLEtBQUssQ0FBRSxJQUFJLENBQ1gsTUFBTSxDQUFFLElBQUksQ0FDWixNQUFNLENBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUMxQyxVQUFVLENBQUUsVUFBVSxDQUN0QixVQUFVLENBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FDNUIsTUFBTSxDQUFFLElBQUksQUFBRSxDQUFDLEFBQ2pCLHVCQUFTLENBQUMsU0FBUyxjQUFDLENBQUMsQUFDbkIsUUFBUSxDQUFFLFFBQVEsQ0FDbEIsS0FBSyxDQUFFLElBQUksQ0FDWCxNQUFNLENBQUUsSUFBSSxDQUNaLEtBQUssQ0FBRSxHQUFHLENBQ1YsTUFBTSxDQUFFLEdBQUcsQ0FDWCxVQUFVLENBQUUsT0FBTyxDQUNuQixNQUFNLENBQUUsU0FBUyxBQUFFLENBQUMsQUFFeEIsV0FBVyw0QkFBQyxDQUFDLEFBQ1gsUUFBUSxDQUFFLFFBQVEsQ0FDbEIsR0FBRyxDQUFFLENBQUMsQ0FDTixJQUFJLENBQUUsQ0FBQyxDQUNQLEtBQUssQ0FBRSxJQUFJLENBQ1gsTUFBTSxDQUFFLElBQUksQ0FDWixVQUFVLENBQUUsV0FBVyxDQUN2QixPQUFPLENBQUUsQ0FBQyxBQUFFLENBQUMsQUFFZixVQUFVLDRCQUFDLENBQUMsQUFDVixRQUFRLENBQUUsUUFBUSxDQUNsQixHQUFHLENBQUUsQ0FBQyxDQUNOLE1BQU0sQ0FBRSxJQUFJLENBQ1osZ0JBQWdCLENBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQUFBRSxDQUFDIn0= */";
    	append_dev(document_1.head, style);
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[32] = list[i];
    	return child_ctx;
    }

    // (293:6) {#if imgSrc}
    function create_if_block(ctx) {
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			img = element("img");
    			if (img.src !== (img_src_value = /*imgSrc*/ ctx[0])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "class", "svelte-thjvuk");
    			add_location(img, file, 293, 8, 7230);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*imgSrc*/ 1 && img.src !== (img_src_value = /*imgSrc*/ ctx[0])) {
    				attr_dev(img, "src", img_src_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(293:6) {#if imgSrc}",
    		ctx
    	});

    	return block;
    }

    // (309:8) {#each coverBoxs as style}
    function create_each_block(ctx) {
    	let div;
    	let div_style_value;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "cover-box svelte-thjvuk");
    			attr_dev(div, "style", div_style_value = obj2style(/*style*/ ctx[32]));
    			add_location(div, file, 309, 10, 7701);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*coverBoxs*/ 4 && div_style_value !== (div_style_value = obj2style(/*style*/ ctx[32]))) {
    				attr_dev(div, "style", div_style_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(309:8) {#each coverBoxs as style}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div6;
    	let div5;
    	let div4;
    	let t0;
    	let div2;
    	let div0;
    	let t1;
    	let div1;
    	let t2;
    	let div3;
    	let dispose;
    	let if_block = /*imgSrc*/ ctx[0] && create_if_block(ctx);
    	let each_value = /*coverBoxs*/ ctx[2];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div6 = element("div");
    			div5 = element("div");
    			div4 = element("div");
    			if (if_block) if_block.c();
    			t0 = space();
    			div2 = element("div");
    			div0 = element("div");
    			t1 = space();
    			div1 = element("div");
    			t2 = space();
    			div3 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div0, "class", "crop-box__move svelte-thjvuk");
    			add_location(div0, file, 298, 8, 7344);
    			attr_dev(div1, "class", "zoom-box svelte-thjvuk");
    			add_location(div1, file, 304, 8, 7537);
    			attr_dev(div2, "class", "crop-box svelte-thjvuk");
    			attr_dev(div2, "style", /*cropBoxStyle*/ ctx[4]);
    			add_location(div2, file, 297, 6, 7292);
    			attr_dev(div3, "class", "cover-wrap svelte-thjvuk");
    			add_location(div3, file, 307, 6, 7631);
    			attr_dev(div4, "class", "crop-wrap svelte-thjvuk");
    			attr_dev(div4, "style", /*wrapStyle*/ ctx[3]);
    			add_location(div4, file, 291, 4, 7142);
    			attr_dev(div5, "class", "crop-img svelte-thjvuk");
    			set_style(div5, "width", /*container*/ ctx[5].width + "px");
    			set_style(div5, "height", /*container*/ ctx[5].height + "px");
    			add_location(div5, file, 288, 2, 7045);
    			add_location(div6, file, 287, 0, 7037);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div6, anchor);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			if (if_block) if_block.m(div4, null);
    			append_dev(div4, t0);
    			append_dev(div4, div2);
    			append_dev(div2, div0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div4, t2);
    			append_dev(div4, div3);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div3, null);
    			}

    			/*div4_binding*/ ctx[31](div4);
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(div0, "mouseup", /*cropMoveEnd*/ ctx[7], false, false, false),
    				listen_dev(div0, "mousedown", /*cropMoveStart*/ ctx[6], false, false, false),
    				listen_dev(div0, "mousemove", /*cropMove*/ ctx[8], false, false, false),
    				listen_dev(div0, "mouseout", /*cropMoveEnd*/ ctx[7], false, false, false),
    				listen_dev(div1, "mousedown", /*zoomMoveStart*/ ctx[9], false, false, false)
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (/*imgSrc*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(div4, t0);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty[0] & /*cropBoxStyle*/ 16) {
    				attr_dev(div2, "style", /*cropBoxStyle*/ ctx[4]);
    			}

    			if (dirty[0] & /*coverBoxs*/ 4) {
    				each_value = /*coverBoxs*/ ctx[2];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div3, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty[0] & /*wrapStyle*/ 8) {
    				attr_dev(div4, "style", /*wrapStyle*/ ctx[3]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div6);
    			if (if_block) if_block.d();
    			destroy_each(each_blocks, detaching);
    			/*div4_binding*/ ctx[31](null);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const MIN_CROP_SIZE = 100;

    function obj2style(obj) {
    	const arr = [];

    	Object.keys(obj).forEach(key => {
    		arr.push(`${key}:${obj[key]}`);
    	});

    	return arr.join(";");
    }

    function instance($$self, $$props, $$invalidate) {
    	let { src } = $$props;
    	let { width } = $$props;
    	let { height } = $$props;
    	const dispatch = createEventDispatcher();

    	const DEFAULT_CROP_BOX = {
    		top: 23,
    		left: 40,
    		width: 150,
    		height: 150,
    		x: 0,
    		y: 0,
    		isMove: false
    	};

    	let imgSrc = "";
    	let imgData = "";
    	let minSize = MIN_CROP_SIZE;
    	let elWrap;

    	// 整体容器
    	let container = {
    		width: width || 450,
    		height: height || 300
    	};

    	// 裁剪容器
    	let wrapBox = { top: 0, width: 0, height: 0, x: 0, y: 0 };

    	// 原图片
    	let originImg = null;

    	// 图片属性
    	let scale = { width: 0, height: 0, ratio: 1 };

    	// 预览块
    	let cropBox = Object.assign({}, DEFAULT_CROP_BOX);

    	// 缩放块
    	let zoomBox = { x: 0, y: 0, isMove: false };

    	// 阴影遮罩块
    	let coverBoxs = [
    		{ left: "0", width: "0", height: "0" },
    		{ left: "0", width: "0" },
    		{
    			top: "0",
    			left: "0",
    			width: "0",
    			height: "0"
    		},
    		{ width: "0" }
    	]; // left:

    	// 设置裁剪容器大小位置
    	function setWrapBox() {
    		if (!scale.width || !scale.height) return null;
    		let width, height, top = 0;

    		if (scale.width > scale.height) {
    			width = container.width;
    			height = Math.floor(container.width * scale.height / scale.width);
    			top = (container.height - height) / 2;
    		} else {
    			width = Math.floor(container.height * scale.width / scale.height);
    			height = container.height;
    		}

    		$$invalidate(15, wrapBox = Object.assign(wrapBox, { width, height, top }));
    		scale.ratio = scale.width / width;
    	}

    	// 设置裁剪容器位置
    	function setWrapPosition() {
    		let x, y;
    		const el = elWrap;

    		if (el) {
    			const rect = el.getBoundingClientRect();
    			x = rect.x || rect.left;
    			y = rect.y || rect.top;
    			$$invalidate(15, wrapBox = Object.assign(wrapBox, { x, y }));
    		}
    	}

    	// 设置默认裁剪框
    	function setDefaultCrop() {
    		const size = Math.min(wrapBox.width, wrapBox.height);

    		// 图片加载后小于默认最小值
    		if (size <= minSize) {
    			$$invalidate(18, cropBox.width = $$invalidate(18, cropBox.height = size, cropBox), cropBox);
    			$$invalidate(18, cropBox.top = $$invalidate(18, cropBox.left = 0, cropBox), cropBox);
    			minSize = size;
    		} else // 图片加载后大于默认最小值&&小于默认裁剪框
    		if (size > minSize && size < cropBox.left + cropBox.width) {
    			$$invalidate(18, cropBox.width = $$invalidate(18, cropBox.height = minSize, cropBox), cropBox);
    			$$invalidate(18, cropBox.top = $$invalidate(18, cropBox.left = 0, cropBox), cropBox);
    		} else {
    			$$invalidate(18, cropBox = Object.assign({}, DEFAULT_CROP_BOX));
    			minSize = MIN_CROP_SIZE;
    		}
    	}

    	// 设置阴影遮挡块
    	function setCoverBox() {
    		function nonnegative(val) {
    			return val < 0 ? 0 : val;
    		}

    		const top = coverBoxs[0],
    			right = coverBoxs[1],
    			bottom = coverBoxs[2],
    			left = coverBoxs[3];

    		top.left = bottom.left = left.width = cropBox.left + "px";
    		top.width = bottom.width = cropBox.width + "px";
    		top.height = cropBox.top + "px";
    		right.left = cropBox.left + cropBox.width + "px";
    		right.width = nonnegative(wrapBox.width - cropBox.left - cropBox.width) + "px";
    		bottom.top = cropBox.top + cropBox.height + "px";
    		bottom.height = nonnegative(wrapBox.height - cropBox.top - cropBox.height) + "px";
    		$$invalidate(2, coverBoxs[0] = top, coverBoxs); // fix: 更新视图赋值
    	}

    	// 生成裁剪后图片
    	function createImg() {
    		const canvas = document.createElement("canvas"), ctx = canvas.getContext("2d");
    		canvas.width = cropBox.width;
    		canvas.height = cropBox.height;
    		ctx.drawImage(originImg, -cropBox.left, -cropBox.top, wrapBox.width, wrapBox.height);
    		imgData = canvas.toDataURL();
    	}

    	function crop() {
    		createImg();
    		dispatch("change", imgData);
    	}

    	// 裁剪框开始移动
    	function cropMoveStart(e) {
    		e.preventDefault();
    		$$invalidate(18, cropBox.x = e.screenX, cropBox);
    		$$invalidate(18, cropBox.y = e.screenY, cropBox);
    		$$invalidate(18, cropBox.isMove = true, cropBox);
    	}

    	// 裁剪框移动结束
    	function cropMoveEnd(e) {
    		e.preventDefault();
    		$$invalidate(18, cropBox.isMove = false, cropBox);
    	}

    	// 裁剪框移动
    	function cropMove(e) {
    		e.preventDefault();
    		const { x, y, left, top, width, height, isMove } = cropBox;
    		if (!isMove) return;

    		const ex = e.screenX,
    			ey = e.screenY,
    			rLeft = left - (x - ex),
    			rTop = top - (y - ey);

    		$$invalidate(
    			18,
    			cropBox.left = rLeft >= 0 && rLeft <= wrapBox.width - width
    			? rLeft
    			: cropBox.left,
    			cropBox
    		);

    		$$invalidate(
    			18,
    			cropBox.top = rTop >= 0 && rTop <= wrapBox.height - height
    			? rTop
    			: cropBox.top,
    			cropBox
    		);

    		$$invalidate(18, cropBox.x = ex, cropBox);
    		$$invalidate(18, cropBox.y = ey, cropBox);
    		setCoverBox();
    		crop();
    	}

    	// 缩放框开始移动
    	function zoomMoveStart(e) {
    		e.preventDefault();
    		zoomBox.isMove = true;
    	}

    	// 缩放框移动结束
    	function zoomMoveEnd(e) {
    		e.preventDefault();
    		zoomBox.isMove = false;
    	}

    	// 缩放框移动
    	function zoomMove(e) {
    		e.preventDefault();
    		const { isMove } = zoomBox, { left, top } = cropBox;
    		if (!isMove) return;

    		const ex = e.clientX,
    			ey = e.clientY,
    			rWidth = ex - wrapBox.x - left,
    			rHeight = ey - wrapBox.y - top,
    			size = Math.max(rWidth, rHeight);

    		if (size >= minSize && size <= Math.min(wrapBox.width - left, wrapBox.height - top)) {
    			$$invalidate(18, cropBox.width = $$invalidate(18, cropBox.height = Math.max(rWidth, rHeight), cropBox), cropBox);
    			setCoverBox();
    			crop();
    		}
    	}

    	function start(src) {
    		if (imgSrc === src) return;
    		$$invalidate(0, imgSrc = src);
    		const img = new Image();
    		img.src = imgSrc;
    		img.setAttribute("crossOrigin", "Anonymous");

    		img.onload = () => {
    			originImg = img;
    			scale.width = img.width;
    			scale.height = img.height;
    			setWrapBox();
    			setWrapPosition();
    			setDefaultCrop();
    			setCoverBox();
    			crop();
    		};
    	}

    	onMount(() => {
    		document.addEventListener("mouseup", zoomMoveEnd);
    		document.addEventListener("mousemove", zoomMove);
    	});

    	onDestroy(() => {
    		document.removeEventListener("mouseup", zoomMoveEnd);
    		document.removeEventListener("mousemove", zoomMove);
    	});

    	const writable_props = ["src", "width", "height"];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Src> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Src", $$slots, []);

    	function div4_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(1, elWrap = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("src" in $$props) $$invalidate(10, src = $$props.src);
    		if ("width" in $$props) $$invalidate(11, width = $$props.width);
    		if ("height" in $$props) $$invalidate(12, height = $$props.height);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		onDestroy,
    		createEventDispatcher,
    		src,
    		width,
    		height,
    		dispatch,
    		MIN_CROP_SIZE,
    		DEFAULT_CROP_BOX,
    		imgSrc,
    		imgData,
    		minSize,
    		elWrap,
    		container,
    		wrapBox,
    		originImg,
    		scale,
    		cropBox,
    		zoomBox,
    		coverBoxs,
    		setWrapBox,
    		setWrapPosition,
    		setDefaultCrop,
    		setCoverBox,
    		createImg,
    		crop,
    		cropMoveStart,
    		cropMoveEnd,
    		cropMove,
    		zoomMoveStart,
    		zoomMoveEnd,
    		zoomMove,
    		obj2style,
    		start,
    		wrapStyle,
    		cropBoxStyle
    	});

    	$$self.$inject_state = $$props => {
    		if ("src" in $$props) $$invalidate(10, src = $$props.src);
    		if ("width" in $$props) $$invalidate(11, width = $$props.width);
    		if ("height" in $$props) $$invalidate(12, height = $$props.height);
    		if ("imgSrc" in $$props) $$invalidate(0, imgSrc = $$props.imgSrc);
    		if ("imgData" in $$props) imgData = $$props.imgData;
    		if ("minSize" in $$props) minSize = $$props.minSize;
    		if ("elWrap" in $$props) $$invalidate(1, elWrap = $$props.elWrap);
    		if ("container" in $$props) $$invalidate(5, container = $$props.container);
    		if ("wrapBox" in $$props) $$invalidate(15, wrapBox = $$props.wrapBox);
    		if ("originImg" in $$props) originImg = $$props.originImg;
    		if ("scale" in $$props) scale = $$props.scale;
    		if ("cropBox" in $$props) $$invalidate(18, cropBox = $$props.cropBox);
    		if ("zoomBox" in $$props) zoomBox = $$props.zoomBox;
    		if ("coverBoxs" in $$props) $$invalidate(2, coverBoxs = $$props.coverBoxs);
    		if ("wrapStyle" in $$props) $$invalidate(3, wrapStyle = $$props.wrapStyle);
    		if ("cropBoxStyle" in $$props) $$invalidate(4, cropBoxStyle = $$props.cropBoxStyle);
    	};

    	let wrapStyle;
    	let cropBoxStyle;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*wrapBox*/ 32768) {
    			 $$invalidate(3, wrapStyle = `
    width: ${wrapBox.width}px;
    height: ${wrapBox.height}px;
    margin-top: ${wrapBox.top}px;`);
    		}

    		if ($$self.$$.dirty[0] & /*cropBox*/ 262144) {
    			 $$invalidate(4, cropBoxStyle = `
    top: ${cropBox.top}px;
    left: ${cropBox.left}px;
    width: ${cropBox.width}px;
    height: ${cropBox.height}px;
  `);
    		}

    		if ($$self.$$.dirty[0] & /*src*/ 1024) {
    			 start(src);
    		}
    	};

    	return [
    		imgSrc,
    		elWrap,
    		coverBoxs,
    		wrapStyle,
    		cropBoxStyle,
    		container,
    		cropMoveStart,
    		cropMoveEnd,
    		cropMove,
    		zoomMoveStart,
    		src,
    		width,
    		height,
    		imgData,
    		minSize,
    		wrapBox,
    		originImg,
    		scale,
    		cropBox,
    		zoomBox,
    		dispatch,
    		DEFAULT_CROP_BOX,
    		setWrapBox,
    		setWrapPosition,
    		setDefaultCrop,
    		setCoverBox,
    		createImg,
    		crop,
    		zoomMoveEnd,
    		zoomMove,
    		start,
    		div4_binding
    	];
    }

    class Src extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document_1.getElementById("svelte-thjvuk-style")) add_css();
    		init(this, options, instance, create_fragment, safe_not_equal, { src: 10, width: 11, height: 12 }, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Src",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*src*/ ctx[10] === undefined && !("src" in props)) {
    			console.warn("<Src> was created without expected prop 'src'");
    		}

    		if (/*width*/ ctx[11] === undefined && !("width" in props)) {
    			console.warn("<Src> was created without expected prop 'width'");
    		}

    		if (/*height*/ ctx[12] === undefined && !("height" in props)) {
    			console.warn("<Src> was created without expected prop 'height'");
    		}
    	}

    	get src() {
    		throw new Error("<Src>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set src(value) {
    		throw new Error("<Src>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get width() {
    		throw new Error("<Src>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set width(value) {
    		throw new Error("<Src>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get height() {
    		throw new Error("<Src>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set height(value) {
    		throw new Error("<Src>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* example/App.svelte generated by Svelte v3.22.2 */

    const { console: console_1 } = globals;

    function create_fragment$1(ctx) {
    	let current;

    	const imgcrop = new Src({
    			props: { src: /*img*/ ctx[0] },
    			$$inline: true
    		});

    	imgcrop.$on("change", change);

    	const block = {
    		c: function create() {
    			create_component(imgcrop.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(imgcrop, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(imgcrop.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(imgcrop.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(imgcrop, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function change(e) {
    	console.log(e.detail);
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let img = "/images/demo.png";
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);
    	$$self.$capture_state = () => ({ ImgCrop: Src, img, change });

    	$$self.$inject_state = $$props => {
    		if ("img" in $$props) $$invalidate(0, img = $$props.img);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [img];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    const app = new App({
        target: document.body,
        props: {
            name: "world"
        }
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
