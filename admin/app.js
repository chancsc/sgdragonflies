(function () {
  'use strict';

  var COLOUR_KEYS = ['black', 'blue', 'brown', 'grey', 'yellow', 'green', 'orange', 'red', 'stripe', 'white'];

  var species = [];
  var selectedIndex = null; // index into the *filtered* view is not used; we track real array index
  var listEl = document.getElementById('species-list');
  var searchEl = document.getElementById('search-input');
  var formEl = document.getElementById('edit-form');
  var emptyEl = document.getElementById('empty-state');
  var statusEl = document.getElementById('status-line');
  var addBtn = document.getElementById('add-btn');

  function setStatus(text) {
    statusEl.textContent = text;
    if (text) setTimeout(function () { if (statusEl.textContent === text) statusEl.textContent = ''; }, 2500);
  }

  function api(method, path, body) {
    var opts = { method: method, headers: {} };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    return fetch(path, opts).then(function (r) {
      if (!r.ok) return r.json().then(function (e) { throw new Error(e.error || r.statusText); });
      return r.json();
    });
  }

  function loadSpecies() {
    return api('GET', '/api/species').then(function (data) {
      species = data;
      renderList();
    });
  }

  function blankRecord() {
    var rec = {};
    ['profile_pic', 'description', 'habitat', 'map', 'common_name', 'confusion_species',
     'profile_pic_author', 'profile_pic_sex', 'family', 'taxon', 'distribution', 'type'
    ].forEach(function (k) { rec[k] = ''; });
    rec.general = '';
    rec.gallery = [];
    rec.gallery_authors = [];
    rec.gallery_sex = [];
    rec.colour = {};
    COLOUR_KEYS.forEach(function (k) { rec.colour[k] = ''; });
    return rec;
  }

  // ---- list rendering ----

  function renderList() {
    var q = searchEl.value.trim().toLowerCase();
    listEl.innerHTML = '';
    species.forEach(function (rec, idx) {
      var name = (rec.common_name || '').toLowerCase();
      var taxon = (rec.taxon || '').toLowerCase();
      if (q && name.indexOf(q) === -1 && taxon.indexOf(q) === -1) return;

      var row = document.createElement('div');
      row.className = 'species-row' + (idx === selectedIndex ? ' selected' : '');
      row.dataset.index = idx;

      var names = document.createElement('div');
      names.className = 'names';
      var common = document.createElement('div');
      common.className = 'common';
      common.textContent = rec.common_name || '(no common name)';
      var taxonDiv = document.createElement('div');
      taxonDiv.className = 'taxon';
      taxonDiv.textContent = rec.taxon || '';
      names.appendChild(common);
      names.appendChild(taxonDiv);

      row.appendChild(names);

      if (rec.general === 'TRUE' || rec.general === true) {
        var badge = document.createElement('span');
        badge.className = 'badge';
        badge.textContent = 'info page';
        row.appendChild(badge);
      }

      row.addEventListener('click', function () { selectIndex(idx); });
      listEl.appendChild(row);
    });
  }

  function selectIndex(idx) {
    selectedIndex = idx;
    renderList();
    renderForm(species[idx]);
  }

  // ---- form rendering ----

  function field(label, inputEl) {
    var row = document.createElement('div');
    row.className = 'field-row';
    var l = document.createElement('label');
    l.textContent = label;
    row.appendChild(l);
    row.appendChild(inputEl);
    return row;
  }

  function textInput(value, onInput) {
    var el = document.createElement('input');
    el.type = 'text';
    el.value = value || '';
    el.addEventListener('input', function () { onInput(el.value); });
    return el;
  }

  function textArea(value, onInput) {
    var el = document.createElement('textarea');
    el.value = value || '';
    el.addEventListener('input', function () { onInput(el.value); });
    return el;
  }

  function selectInput(value, options, onInput) {
    var el = document.createElement('select');
    options.forEach(function (opt) {
      var o = document.createElement('option');
      o.value = opt;
      o.textContent = opt || '(none)';
      if (opt === value) o.selected = true;
      el.appendChild(o);
    });
    el.addEventListener('change', function () { onInput(el.value); });
    return el;
  }

  function readFileAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function suggestFilename(taxon, author, original) {
    var ext = (original.split('.').pop() || 'jpg').toLowerCase();
    var base = (taxon || 'species').trim().replace(/\s+/g, '_');
    if (author) base += '_' + author.trim().replace(/\s+/g, '_');
    return base.replace(/[^A-Za-z0-9._\-]/g, '') + '.' + ext;
  }

  function photoUploadWidget(rec, currentPath, authorHint, onUploaded) {
    var wrap = document.createElement('div');
    wrap.style.display = 'flex';
    wrap.style.flexDirection = 'column';
    wrap.style.gap = '6px';

    var picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = 'image/*';
    picker.addEventListener('change', function () {
      var file = picker.files[0];
      if (!file) return;
      readFileAsDataUrl(file).then(function (dataUrl) {
        var filename = suggestFilename(rec.taxon, authorHint(), file.name);
        var newName = prompt('Save photo as (in images/):', filename);
        if (!newName) return;
        return api('POST', '/api/upload', { filename: newName, dataUrl: dataUrl }).then(function (res) {
          onUploaded(res.path);
          setStatus('Photo uploaded: ' + newName);
        });
      }).catch(function (e) { alert('Upload failed: ' + e.message); });
    });

    wrap.appendChild(picker);
    return wrap;
  }

  function galleryRow(rec, idx, rerender) {
    var block = document.createElement('div');
    block.className = 'photo-block';

    var img = document.createElement('img');
    img.src = rec.gallery[idx] ? '/' + rec.gallery[idx] : '';
    img.onerror = function () { this.style.visibility = 'hidden'; };
    block.appendChild(img);

    var fields = document.createElement('div');
    fields.className = 'photo-fields';

    var authorInput = document.createElement('input');
    authorInput.type = 'text';
    authorInput.placeholder = 'Photo author';
    authorInput.value = rec.gallery_authors[idx] || '';
    authorInput.addEventListener('input', function () { rec.gallery_authors[idx] = authorInput.value; });

    var sexInput = document.createElement('input');
    sexInput.type = 'text';
    sexInput.placeholder = 'Sex (e.g. MALE)';
    sexInput.value = rec.gallery_sex[idx] || '';
    sexInput.addEventListener('input', function () { rec.gallery_sex[idx] = sexInput.value; });

    var upload = photoUploadWidget(rec, rec.gallery[idx], function () { return authorInput.value; }, function (path) {
      rec.gallery[idx] = path;
      rerender();
    });

    fields.appendChild(authorInput);
    fields.appendChild(sexInput);
    fields.appendChild(upload);
    block.appendChild(fields);

    var removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-photo';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', function () {
      rec.gallery.splice(idx, 1);
      rec.gallery_authors.splice(idx, 1);
      rec.gallery_sex.splice(idx, 1);
      rerender();
    });
    block.appendChild(removeBtn);

    return block;
  }

  function renderForm(rec) {
    emptyEl.hidden = true;
    formEl.hidden = false;
    formEl.innerHTML = '';

    function rerender() { renderForm(rec); }

    var basics = document.createElement('fieldset');
    var basicsLegend = document.createElement('legend');
    basicsLegend.textContent = 'Basics';
    basics.appendChild(basicsLegend);

    var row1 = document.createElement('div');
    row1.className = 'two-col';
    row1.appendChild(field('Common name', textInput(rec.common_name, function (v) { rec.common_name = v; })));
    row1.appendChild(field('Scientific name (taxon)', textInput(rec.taxon, function (v) { rec.taxon = v; })));
    basics.appendChild(row1);

    var row2 = document.createElement('div');
    row2.className = 'three-col';
    row2.appendChild(field('Family', textInput(rec.family, function (v) { rec.family = v; })));
    row2.appendChild(field('Type', selectInput(rec.type, ['', 'anisoptera', 'zygoptera'], function (v) { rec.type = v; })));
    row2.appendChild(field('Info page only (no full profile)', selectInput(
      rec.general === true ? 'TRUE' : (rec.general || ''), ['', 'TRUE'], function (v) { rec.general = v; }
    )));
    basics.appendChild(row2);

    formEl.appendChild(basics);

    var textFieldsSet = document.createElement('fieldset');
    var textLegend = document.createElement('legend');
    textLegend.textContent = 'Description';
    textFieldsSet.appendChild(textLegend);
    textFieldsSet.appendChild(field('Description', textArea(rec.description, function (v) { rec.description = v; })));
    textFieldsSet.appendChild(field('Habitat', textArea(rec.habitat, function (v) { rec.habitat = v; })));
    textFieldsSet.appendChild(field('Distribution', textArea(rec.distribution, function (v) { rec.distribution = v; })));
    textFieldsSet.appendChild(field('Confusion species (notes on similar-looking species)', textInput(rec.confusion_species, function (v) { rec.confusion_species = v; })));
    formEl.appendChild(textFieldsSet);

    var colourSet = document.createElement('fieldset');
    var colourLegend = document.createElement('legend');
    colourLegend.textContent = 'Colour tags';
    colourSet.appendChild(colourLegend);
    var grid = document.createElement('div');
    grid.className = 'colour-grid';
    if (!rec.colour) rec.colour = {};
    COLOUR_KEYS.forEach(function (key) {
      var label = document.createElement('label');
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!rec.colour[key];
      cb.addEventListener('change', function () { rec.colour[key] = cb.checked ? 1 : ''; });
      label.appendChild(cb);
      label.appendChild(document.createTextNode(key));
      grid.appendChild(label);
    });
    colourSet.appendChild(grid);
    formEl.appendChild(colourSet);

    var profileSet = document.createElement('fieldset');
    var profileLegend = document.createElement('legend');
    profileLegend.textContent = 'Profile photo';
    profileSet.appendChild(profileLegend);

    var profileBlock = document.createElement('div');
    profileBlock.className = 'photo-block';
    var profileImg = document.createElement('img');
    profileImg.src = rec.profile_pic ? '/' + rec.profile_pic : '';
    profileImg.onerror = function () { this.style.visibility = 'hidden'; };
    profileBlock.appendChild(profileImg);

    var profileFields = document.createElement('div');
    profileFields.className = 'photo-fields';
    var pAuthor = document.createElement('input');
    pAuthor.type = 'text';
    pAuthor.placeholder = 'Photo author';
    pAuthor.value = rec.profile_pic_author || '';
    pAuthor.addEventListener('input', function () { rec.profile_pic_author = pAuthor.value; });
    var pSex = document.createElement('input');
    pSex.type = 'text';
    pSex.placeholder = 'Sex (e.g. MALE)';
    pSex.value = rec.profile_pic_sex || '';
    pSex.addEventListener('input', function () { rec.profile_pic_sex = pSex.value; });
    var pUpload = photoUploadWidget(rec, rec.profile_pic, function () { return pAuthor.value; }, function (path) {
      rec.profile_pic = path;
      rerender();
    });
    profileFields.appendChild(pAuthor);
    profileFields.appendChild(pSex);
    profileFields.appendChild(pUpload);
    profileBlock.appendChild(profileFields);
    profileSet.appendChild(profileBlock);
    formEl.appendChild(profileSet);

    var gallerySet = document.createElement('fieldset');
    var galleryLegend = document.createElement('legend');
    galleryLegend.textContent = 'Gallery photos';
    gallerySet.appendChild(galleryLegend);
    if (!rec.gallery) rec.gallery = [];
    if (!rec.gallery_authors) rec.gallery_authors = [];
    if (!rec.gallery_sex) rec.gallery_sex = [];
    rec.gallery.forEach(function (_, idx) {
      gallerySet.appendChild(galleryRow(rec, idx, rerender));
    });
    var addGalleryBtn = document.createElement('button');
    addGalleryBtn.type = 'button';
    addGalleryBtn.id = 'add-gallery-btn';
    addGalleryBtn.textContent = '+ Add gallery photo';
    addGalleryBtn.addEventListener('click', function () {
      rec.gallery.push('');
      rec.gallery_authors.push('');
      rec.gallery_sex.push('');
      rerender();
    });
    gallerySet.appendChild(addGalleryBtn);
    formEl.appendChild(gallerySet);

    var actionRow = document.createElement('div');
    actionRow.id = 'action-row';
    var saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.id = 'save-btn';
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', function () { save(rec); });
    var deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.id = 'delete-btn';
    deleteBtn.textContent = 'Delete species';
    deleteBtn.addEventListener('click', function () { deleteSelected(); });
    actionRow.appendChild(saveBtn);
    actionRow.appendChild(deleteBtn);
    formEl.appendChild(actionRow);
  }

  function save(rec) {
    var isNew = selectedIndex === null || selectedIndex === undefined;
    // Filter out empty trailing gallery entries left over from an aborted "+ Add gallery photo"
    var keep = rec.gallery.map(function (v, i) { return !!v || !!rec.gallery_authors[i] || !!rec.gallery_sex[i]; });
    rec.gallery = rec.gallery.filter(function (_, i) { return keep[i]; });
    rec.gallery_authors = rec.gallery_authors.filter(function (_, i) { return keep[i]; });
    rec.gallery_sex = rec.gallery_sex.filter(function (_, i) { return keep[i]; });

    var request = isNew
      ? api('POST', '/api/species', rec)
      : api('PUT', '/api/species/' + selectedIndex, rec);

    request.then(function (res) {
      setStatus('Saved.');
      return loadSpecies().then(function () {
        selectIndex(isNew ? res.index : selectedIndex);
      });
    }).catch(function (e) { alert('Save failed: ' + e.message); });
  }

  function deleteSelected() {
    if (selectedIndex === null || selectedIndex === undefined) return;
    var rec = species[selectedIndex];
    if (!confirm('Delete "' + (rec.common_name || rec.taxon) + '"? This cannot be undone here (though you can still recover it from git history once published).')) return;
    api('DELETE', '/api/species/' + selectedIndex).then(function () {
      setStatus('Deleted.');
      selectedIndex = null;
      formEl.hidden = true;
      emptyEl.hidden = false;
      return loadSpecies();
    }).catch(function (e) { alert('Delete failed: ' + e.message); });
  }

  addBtn.addEventListener('click', function () {
    selectedIndex = null;
    renderList();
    renderForm(blankRecord());
  });

  searchEl.addEventListener('input', renderList);

  loadSpecies().catch(function (e) {
    setStatus('Failed to load: ' + e.message);
  });
})();
