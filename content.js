(function () {
  'use strict';

  function getGradeRows() {
    const rows = [];
    document.querySelectorAll('table.oe_form_group tr').forEach(tr => {
      const cells = [...tr.querySelectorAll('td')]
        .map(td => td.innerText.trim()).filter(Boolean);
      if (cells.length === 7 && /^\d+\.\d+$/.test(cells[3])) {
        rows.push({ tr, semester: cells[0], credits: parseFloat(cells[3]), points: parseFloat(cells[4]) });
      }
    });
    return rows;
  }

  function inject() {
    document.querySelectorAll('.uet-dmc-row').forEach(r => r.remove());
    const gradeRows = getGradeRows();
    if (gradeRows.length === 0) return;

    const SEM_ORDER = ['Fall 2024','Spring 2025','Fall 2025','Spring 2026','Fall 2026','Spring 2027'];
    const groups = [];
    let current = null;
    gradeRows.forEach(row => {
      if (!current || current.sem !== row.semester) {
        current = { sem: row.semester, rows: [], lastTr: null };
        groups.push(current);
      }
      current.rows.push(row);
      current.lastTr = row.tr;
    });
    groups.sort((a, b) => {
      const ai = SEM_ORDER.indexOf(a.sem), bi = SEM_ORDER.indexOf(b.sem);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

    let cumCredits = 0, cumPoints = 0;
    groups.forEach(g => {
      const sc = g.rows.reduce((s, r) => s + r.credits, 0);
      const sp = g.rows.reduce((s, r) => s + r.points, 0);
      cumCredits += sc; cumPoints += sp;
      const sgpa = sc > 0 ? sp / sc : 0;
      const cgpa = cumCredits > 0 ? cumPoints / cumCredits : 0;

      // Build row safely without innerHTML
      const labelRow = document.createElement('tr');
      labelRow.className = 'uet-dmc-row';
      const td = document.createElement('td');
      td.colSpan = 7;
      td.style.cssText = 'text-align:right;padding:8px 16px 10px;font-family:sans-serif;font-size:14px;border-top:1px solid #ddd;background:#fafafa;';
      const s1 = document.createElement('span');
      s1.style.cssText = 'color:#c0392b;font-weight:700;text-decoration:underline;margin-right:24px;';
      s1.textContent = 'SGPA=' + sgpa.toFixed(3);
      const s2 = document.createElement('span');
      s2.style.cssText = 'color:#c0392b;font-weight:700;text-decoration:underline;';
      s2.textContent = 'CGPA=' + cgpa.toFixed(3);
      td.appendChild(s1);
      td.appendChild(s2);
      labelRow.appendChild(td);
      g.lastTr.parentNode.insertBefore(labelRow, g.lastTr.nextSibling);
    });

    injectExportButton();
  }

  function injectExportButton() {
    if (document.getElementById('uet-dmc-pdf-btn')) return;
    const showBtn = [...document.querySelectorAll('button')].find(b => b.innerText.includes('Show Semester Summary'));
    if (!showBtn) return;

    const btn = document.createElement('button');
    btn.id = 'uet-dmc-pdf-btn';
    btn.textContent = '\u2B07 Export PDF';
    btn.className = showBtn.className;
    btn.style.cssText = showBtn.style.cssText;
    btn.style.marginLeft = '10px';
    btn.addEventListener('click', showPrintOverlay);
    showBtn.parentNode.insertBefore(btn, showBtn.nextSibling);
  }

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function buildPrintHTML() {
    const allText = document.querySelector('.oe_form_sheet_width')?.innerText || '';
    const regNo   = esc((allText.match(/Registration No\s+([\w-]+)/) || [])[1] || 'N/A');
    const stdName = esc(((allText.match(/Student Name\s+([A-Z ]+)/) || [])[1] || 'Student').trim());
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', {day:'2-digit',month:'2-digit',year:'numeric'})
      + ', ' + now.toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit'});

    const gradeRows = getGradeRows();
    const SEM_ORDER = ['Fall 2024','Spring 2025','Fall 2025','Spring 2026','Fall 2026','Spring 2027'];
    const groups = [];
    let current = null;
    gradeRows.forEach(row => {
      const cells = [...row.tr.querySelectorAll('td')].map(td => td.innerText.trim()).filter(Boolean);
      if (!current || current.sem !== row.semester) {
        current = { sem: row.semester, courses: [] };
        groups.push(current);
      }
      current.courses.push({ name: cells[1], teacher: cells[2], ch: parseFloat(cells[3]), gp: parseFloat(cells[4]), grade: cells[5], status: cells[6] });
    });
    groups.sort((a, b) => {
      const ai = SEM_ORDER.indexOf(a.sem), bi = SEM_ORDER.indexOf(b.sem);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

    let cumCredits = 0, cumPoints = 0;
    const semRowsHTML = groups.map(g => {
      const sc = g.courses.reduce((s, c) => s + c.ch, 0);
      const sp = g.courses.reduce((s, c) => s + c.gp, 0);
      cumCredits += sc; cumPoints += sp;
      const sgpa = (sp / sc).toFixed(3);
      const cgpa = (cumPoints / cumCredits).toFixed(3);
      const courseRows = g.courses.map(c => `
        <tr>
          <td>${esc(g.sem)}</td><td>${esc(c.name)}</td><td>${esc(c.teacher)}</td>
          <td>${c.ch.toFixed(2)}</td><td>${c.gp.toFixed(1)}</td>
          <td>${esc(c.grade)}</td>
          <td style="color:${c.status==='Confirmed'?'#2e7d32':'#e65100'}">${esc(c.status)}</td>
        </tr>`).join('');
      return `${courseRows}
        <tr class="totals-row">
          <td colspan="3"></td>
          <td><strong>${sc.toFixed(1)}</strong></td>
          <td><strong>${sp.toFixed(2)}</strong></td>
          <td style="white-space:nowrap;font-size:11px;"><strong>GPA: ${sgpa}</strong></td>
          <td style="white-space:nowrap;font-size:11px;"><strong>CGPA: ${cgpa}</strong></td>
        </tr>`;
    }).join('');

    const finalCGPA = (cumPoints / cumCredits).toFixed(3);

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>DMC - ${stdName}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:Arial,sans-serif;font-size:11px;color:#000;padding:20px 28px;}
  .header-date{font-size:10px;color:#333;margin-bottom:6px;}
  h1{text-align:center;font-size:18px;font-weight:700;margin-bottom:14px;}
  .meta-table{width:100%;border-collapse:collapse;margin-bottom:16px;}
  .meta-table td{padding:3px 0;font-size:11px;}
  .meta-table td:nth-child(odd){font-weight:700;width:130px;}
  table.courses{width:100%;border-collapse:collapse;margin-bottom:12px;}
  table.courses th{border:1px solid #999;padding:5px 8px;text-align:left;font-size:11px;background:#f0f0f0;font-weight:700;}
  table.courses td{border:1px solid #ccc;padding:4px 8px;font-size:11px;vertical-align:top;}
  tr.totals-row td{border:1px solid #999;padding:5px 8px;background:#f5f5f5;font-size:11px;}
  .final-cgpa{margin-top:10px;font-size:11px;text-align:right;}
  .footer{margin-top:8px;font-size:9px;color:#888;}
  @media print{body{padding:10px 16px;}}
</style></head><body>
  <div class="header-date">${esc(dateStr)} &nbsp;&nbsp;&nbsp; Odoo</div>
  <h1>Student DMC</h1>
  <table class="meta-table">
    <tr>
      <td>Registration No</td><td>${regNo}</td>
      <td style="width:120px;">Student Name</td><td>${stdName}</td>
    </tr>
  </table>
  <table class="courses">
    <thead><tr><th>Semester name</th><th>Subject Name</th><th>Teacher name</th><th>CH</th><th>GP</th><th>Grade</th><th>Status</th></tr></thead>
    <tbody>${semRowsHTML}</tbody>
  </table>
  <div class="final-cgpa">CGPA: ${cumPoints.toFixed(2)} &divide; ${cumCredits.toFixed(0)} = ${finalCGPA}</div>
  <div class="footer">${esc(window.location.href)}</div>
</body></html>`;
  }

  function showPrintOverlay() {
    const existing = document.getElementById('uet-dmc-overlay');
    if (existing) { existing.remove(); return; }

    const html = buildPrintHTML();
    const overlay = document.createElement('div');
    overlay.id = 'uet-dmc-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:99999;display:flex;flex-direction:column;align-items:center;';

    const bar = document.createElement('div');
    bar.style.cssText = 'width:100%;background:#1a3a5c;padding:10px 20px;display:flex;justify-content:space-between;align-items:center;box-sizing:border-box;flex-shrink:0;';

    const title = document.createElement('span');
    title.style.cssText = 'color:#fff;font-family:sans-serif;font-weight:600;font-size:14px;';
    title.textContent = '\uD83D\uDCC4 DMC Preview';

    const btnGroup = document.createElement('div');
    btnGroup.style.cssText = 'display:flex;gap:10px;';

    const printBtn = document.createElement('button');
    printBtn.style.cssText = 'background:#c0392b;color:#fff;border:none;border-radius:4px;padding:6px 16px;font-size:13px;cursor:pointer;font-family:sans-serif;';
    printBtn.textContent = '\uD83D\uDDB8 Print / Save PDF';
    printBtn.addEventListener('click', () => {
      document.querySelector('#uet-dmc-overlay iframe').contentWindow.print();
    });

    const closeBtn = document.createElement('button');
    closeBtn.style.cssText = 'background:#555;color:#fff;border:none;border-radius:4px;padding:6px 14px;font-size:13px;cursor:pointer;font-family:sans-serif;';
    closeBtn.textContent = '\u2715 Close';
    closeBtn.addEventListener('click', () => overlay.remove());

    btnGroup.appendChild(printBtn);
    btnGroup.appendChild(closeBtn);
    bar.appendChild(title);
    bar.appendChild(btnGroup);

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'width:95%;max-width:1000px;flex:1;margin:12px 0;border:none;border-radius:4px;background:#fff;';
    iframe.srcdoc = html;

    overlay.appendChild(bar);
    overlay.appendChild(iframe);
    document.body.appendChild(overlay);
  }

  let debounce;
  const observer = new MutationObserver(() => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      if (getGradeRows().length > 0) inject();
    }, 500);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(inject, 1200);
})();
