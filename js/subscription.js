'use strict';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('subscription-form');
    if (!form) return;

    const status = document.getElementById('subscription-status');
    const submitButton = document.getElementById('subscription-submit');
    const currentCourses = form.elements.curso;
    const newCourses = form.elements.novo;
    const configuredBase = document.querySelector('meta[name="api-base-url"]')?.content.trim();
    const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const apiBase = (window.MOSTRA_API_BASE_URL || configuredBase || (isLocal ? 'http://localhost:3000/api' : '/api')).replace(/\/+$/, '');

    function showStatus(message, kind = 'error') {
        status.textContent = message;
        status.className = `rounded-lg p-4 ${kind === 'success' ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900'}`;
    }

    function fillSelect(select, values, placeholder) {
        select.replaceChildren();
        const empty = document.createElement('option');
        empty.value = '';
        empty.textContent = placeholder;
        select.append(empty);
        for (const value of values) {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            select.append(option);
        }
    }

    async function readJson(response) {
        try { return await response.json(); } catch { return {}; }
    }

    async function loadCourses() {
        try {
            const response = await fetch(`${apiBase}/courses`, { headers: { Accept: 'application/json' } });
            const body = await readJson(response);
            if (!response.ok || !body.data) throw new Error(body.message || 'Catálogo indisponível.');
            fillSelect(currentCourses, body.data.cursos_atuais || [], 'Selecione um curso');
            fillSelect(newCourses, body.data.cursos_novos || [], 'Nenhum');
            currentCourses.disabled = false;
            newCourses.disabled = false;
            submitButton.disabled = false;
        } catch (error) {
            fillSelect(currentCourses, [], 'Não foi possível carregar os cursos');
            showStatus(`${error.message} Tente novamente mais tarde.`);
        }
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        submitButton.disabled = true;
        status.classList.add('hidden');
        const values = new FormData(form);
        const payload = {
            nome: values.get('nome'), idade: Number(values.get('idade')),
            telefone: values.get('telefone'), email: values.get('email'),
            curso: values.get('curso'), novo: values.get('novo') || null,
            outro: values.get('outro') || null, novidade: values.get('novidade') === 'on' ? 1 : 0,
            feedback: values.get('feedback') || null, saber: values.get('saber') || null,
        };

        try {
            const response = await fetch(`${apiBase}/subscriptions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify(payload),
            });
            const body = await readJson(response);
            if (!response.ok) {
                const details = Array.isArray(body.errors)
                    ? body.errors.map((error) => `${error.campo}: ${error.mensagem}`).join(' ')
                    : body.message;
                throw new Error(details || 'Não foi possível enviar a inscrição.');
            }
            form.reset();
            showStatus('Inscrição realizada com sucesso.', 'success');
        } catch (error) {
            showStatus(error.message || 'Falha de conexão com o servidor.');
        } finally {
            submitButton.disabled = false;
        }
    });

    loadCourses();
});
