/*
 * App-shell offline cache for Dragonflies of Singapore.
 *
 * The original build relied on an IndexedDB/WebSQL shim (see scripts/main-built.js)
 * to persist Backbone models, plus an HTML5 AppCache (appcache.html / appcache.manifest)
 * to cache the app shell and all ~290 species photos. Both mechanisms are obsolete:
 * WebSQL is gone from browsers, and AppCache was removed entirely around 2020-2022.
 * This worker replaces both with a standard Service Worker cache. The precache list
 * below was rebuilt from the original appcache.manifest, which is the only place that
 * listed every species photo (they're referenced dynamically inside scripts/data.js,
 * not as static links, so a plain crawl of the HTML/CSS/JS misses them).
 */

var CACHE_VERSION = 'sgdragonfly-shell-v10';

var PRECACHE_URLS = [
  './',
  './images/Acisoma_panorpoides_Drriss_&_Marrionn.jpg',
  './images/Acisoma_panorpoides_Jkadavoor_Jee1.jpg',
  './images/Acisoma_panorpoides_Jkadavoor_Jee2.jpg',
  './images/Aethriamanta_aethra_leonard_tan_m.jpg',
  './images/Aethriamanta_aethra_leonard_tan_m_young.jpg',
  './images/Aethriamanta_brevipennis_Nikhil_Prabhakar.jpg',
  './images/Aethriamanta_brevipennis_Vijay_Anand_Ismavel.jpg',
  './images/Aethriamanta_gracilis_Michael_MK_Khor2.jpg',
  './images/Aethriamanta_gracilis_ronnie_ang_m.jpg',
  './images/Agriocnemis_femina_Weiting_Liu.jpg',
  './images/Agriocnemis_femina_gancw.jpg',
  './images/Agriocnemis_femina_gbohne.jpg',
  './images/Agriocnemis_nana_H.K.Tang.jpg',
  './images/Agriocnemis_nana_Keith_Wilson.jpg',
  './images/Agriocnemis_pygmaea_Keith_Wilson.jpg',
  './images/Agrionoptera_insignis_csc.jpg',
  './images/Agrionoptera_sexlineata_H.K.Tang.jpg',
  './images/Agrionoptera_sexlineata_gan_cw_f.jpg',
  './images/Agrionoptera_sexlineata_keith_wilson.jpg',
  './images/Amphicnemis_Bebar_C.Y.Choong.jpg',
  './images/Amphicnemis_gracilis_H.K.Tang_female_immature.jpg',
  './images/Amphicnemis_gracilis_budak_female_mature.jpg',
  './images/Amphicnemis_gracilis_budak_male.jpg',
  './images/Anax_guttatus_Michael_MK_Khor_f.jpg',
  './images/Anax_guttatus_Vishal_Bhave.jpg',
  './images/Anax_guttatus_Weiting_Liu.jpg',
  './images/Archibasis_melanocyana_Keith_Wilson.jpg',
  './images/Archibasis_rebeccae_Keith_Wilson.jpg',
  './images/Archibasis_viola_budak_1.jpg',
  './images/Archibasis_viola_budak_2.jpg',
  './images/Archibasis_viola_budak_3.jpg',
  './images/Argiocnemis_rubescens_GanCW.jpg',
  './images/Argiocnemis_rubescens_GanCW2.jpg',
  './images/Argiocnemis_rubescens_Keith_Wilson.jpg',
  './images/BRC_approved_logo.png',
  './images/Brachydiplax_chalybea_Jkadavoor_Jee1.jpg',
  './images/Brachydiplax_chalybea_Jkadavoor_Jee2.jpg',
  './images/Brachydiplax_farinosa_Vijay_Anand_Ismavel1.jpg',
  './images/Brachydiplax_farinosa_Vijay_Anand_Ismavel2.jpg',
  './images/Brachydiplax_farinosa_Vijay_Anand_Ismavel3.jpg',
  './images/Brachygonia_oculata_cy_choong_f.jpg',
  './images/Brachygonia_oculata_cy_choong_m.jpg',
  './images/Brachythemis_contaminata_Jerry_Oldenettel.jpg',
  './images/Brachythemis_contaminata_Jerry_Oldenettel2.jpg',
  './images/Brachythemis_contaminata_Rushen.jpg',
  './images/Burmagomphus_divaricatus_Apisit_Wilaijit.jpg',
  './images/Burmagomphus_divaricatus_cy_choong_f.jpg',
  './images/Burmagomphus_divaricatus_cy_choong_m.jpg',
  './images/Burmagomphus_plagiatus_C.Y.Choong.jpg',
  './images/Camacinia_gigantea_Michael_MK_Khor.jpg',
  './images/Camacinia_gigantea_Michael_MK_Khor2.jpg',
  './images/Camacinia_gigantea_leonard_tan_m.jpg',
  './images/Ceriagrion_cerinorubellum_Jkadavoor_Jee.jpg',
  './images/Ceriagrion_cerinorubellum_csc.jpg',
  './images/Ceriagrion_cerinorubellum_gancw.jpg',
  './images/Ceriagrion_chaoi_Anthony_Quek.jpg',
  './images/Chalybeothemis_fluviatilis_Leonard_Tan.jpg',
  './images/Coeliccia_albicauda_gancw.jpg',
  './images/Coeliccia_albicauda_keith_wilson1.jpg',
  './images/Coeliccia_albicauda_keith_wilson2.jpg',
  './images/Coeliccia_didyma_Apisit_wilaijit.jpg',
  './images/Coeliccia_didyma_Luvjoy_Choker.jpg',
  './images/Coeliccia_octogesima_H.K.Tang.jpg',
  './images/Coeliccia_octogesima_keith_wilson1.jpg',
  './images/Coeliccia_octogesima_keith_wilson2.jpg',
  './images/Copera_marginipes_Charles_Lam.jpg',
  './images/Copera_marginipes_keith_wilson.jpg',
  './images/Copera_vittata_keith_wilson1.jpg',
  './images/Copera_vittata_keith_wilson2.jpg',
  './images/Cratilla_lineata_Jkadavoor_Jee_m.jpg',
  './images/Cratilla_lineata_Vijay_Anand_Ismavel_f.jpg',
  './images/Cratilla_metallica_csc.jpg',
  './images/Cratilla_metallica_csc2.jpg',
  './images/Crocothemis_servilia_csc1.jpg',
  './images/Crocothemis_servilia_csc2.jpg',
  './images/Devadatta_argyoides_CW_Gan.jpg',
  './images/Devadatta_argyoides_CW_Gan_2.jpg',
  './images/Devadatta_argyoides_Keith_Wilson.jpg',
  './images/Diplacodes_nebulosa_csc.jpg',
  './images/Diplacodes_nebulosa_keith_wilson.jpg',
  './images/Diplacodes_trivialis_Jkadavoor_Jee.jpg',
  './images/Diplacodes_trivialis_Jkadavoor_Jee_mating.jpg',
  './images/Diplacodes_trivialis_Pavel_Kirillov.jpg',
  './images/Drepanosticta_quadrata_gancw_f.jpg',
  './images/Drepanosticta_quadrata_keith_wilson_f.jpg',
  './images/Drepanosticta_quadrata_keith_wilson_m.jpg',
  './images/Dysphaea_dimidiata_Keith_Wilson.jpg',
  './images/Epophthalmia_vittigera_csc.jpg',
  './images/Epophthalmia_vittigera_csc2.jpg',
  './images/Euphaea_impar_GanCW.jpg',
  './images/Euphaea_impar_Keith_Wilson_1.jpg',
  './images/Euphaea_impar_Keith_Wilson_2.jpg',
  './images/Gynacantha_basiguttata_chun_xing_wong.jpg',
  './images/Gynacantha_bayadera_Jkadavoor_Jee.jpg',
  './images/Gynacantha_bayadera_Weiting_Liu.jpg',
  './images/Gynacantha_bayadera_csc.jpg',
  './images/Gynacantha_dohrni_Keith_Wilson.jpg',
  './images/Gynacantha_subinterrupta_Keith_Wilson.jpg',
  './images/Heliaeschna_crassa_Tang_Hung_Bun.jpg',
  './images/Heliaeschna_uninervulata_Leonard_tan.jpg',
  './images/Heliaeschna_uninervulata_Leonard_tan_m.jpg',
  './images/Heliaeschna_uninervulata_Tang_hung_bun.jpg',
  './images/Heliogomphus_kelantanensis_Leonard_Tan.jpg',
  './images/Heliogomphus_kelantanensis_Leonard_Tan2.jpg',
  './images/Hemicordulia_tenera_dennis_farrell.jpg',
  './images/Hemicordulia_tenera_dennis_farrell2.jpg',
  './images/Hydrobasileus_croceus_csc.jpg',
  './images/Hydrobasileus_croceus_csc2.jpg',
  './images/Icon-192.png',
  './images/Icon-48.png',
  './images/Icon-60@3x.png',
  './images/Icon-72.png',
  './images/Icon-72@2x.png',
  './images/Icon-76.png',
  './images/Icon-76@2x.png',
  './images/Icon-96.png',
  './images/Icon@2x.png',
  './images/Ictinogomphus_decoratus_csc.jpg',
  './images/Ictinogomphus_decoratus_melaenops_gancw1.jpg',
  './images/Ictinogomphus_decoratus_melaenops_gancw2.jpg',
  './images/Idionyx_yolanda_leonard_tan.jpg',
  './images/Indothemis_limbata_Anthony_Quek.jpg',
  './images/Indothemis_limbata_Leonard_Tan.jpg',
  './images/Ischnura_senegalensis_H.K.Tang.jpg',
  './images/Ischnura_senegalensis_keith_wilson.jpg',
  './images/Ischnura_senegalensis_phxyq.jpg',
  './images/Lathrecista_asiatica_csc.jpg',
  './images/Leptogomphus_risi_Leonard_Tan1.jpg',
  './images/Leptogomphus_risi_Leonard_Tan2.jpg',
  './images/Leptogomphus_risi_Leonard_Tan3.jpg',
  './images/Lestes_praemorsus_H._K._Tang.jpg',
  './images/Lestes_praemorsus_Jkadavoor_Jee.jpg',
  './images/Lestes_praemorsus_Weiting_Liu.jpg',
  './images/Libellago_aurantiaca_Keith_Wilson.jpg',
  './images/Libellago_hyalina_eddy_lee_f.jpg',
  './images/Libellago_hyalina_eddy_lee_m1.jpg',
  './images/Libellago_hyalina_eddy_lee_m2.jpg',
  './images/Libellago_lineata_Keith_Wilson.jpg',
  './images/Libellago_lineata_Weiting_Liu.jpg',
  './images/Libellago_lineata_Wu_Bird_1.jpg',
  './images/Libellago_stigmatizans_Keith_Wilson_1.jpg',
  './images/Libellago_stigmatizans_Keith_Wilson_2.jpg',
  './images/Libellago_stigmatizans_Keith_Wilson_3.jpg',
  './images/Lyriothemis_cleis_gancw_f.jpg',
  './images/Lyriothemis_cleis_keith_wilson_m.jpg',
  './images/Macrodiplax_cora_CCCA.jpg',
  './images/Macrodiplax_cora_Weiting_Liu.jpg',
  './images/Macrogomphus_quadratus_gancw.jpg',
  './images/Macromia_cincta_budak.jpg',
  './images/Macromia_cincta_leonard_tan.jpg',
  './images/Macromia_cincta_leonard_tan2.jpg',
  './images/Macromia_cydippe_leonard_tan1_m.jpg',
  './images/Macromia_cydippe_leonard_tan2.jpg',
  './images/Macromia_cydippe_leonard_tan3.jpg',
  './images/Merogomphus_femoralis_Tang_hung_bun.jpg',
  './images/Merogomphus_femoralis_Tang_hung_bun_f.jpg',
  './images/Microgomphus_chelifer_Keith_wilson1.jpg',
  './images/Microgomphus_chelifer_Keith_wilson2.jpg',
  './images/Mortonagrion_arthuri_anthony_quek_f.jpg',
  './images/Mortonagrion_arthuri_anthony_quek_m.jpg',
  './images/Mortonagrion_falcatum_C.Y.Choong.jpg',
  './images/Mortonagrion_falcatum_tang_hung_bun.jpg',
  './images/Mortonagrion_falcatum_tang_hung_bun2.jpg',
  './images/Nannophya_pygmaea_csc1.jpg',
  './images/Nannophya_pygmaea_weiting_liu_f.jpg',
  './images/Nesoxenia_lineata_keith_wilson.jpg',
  './images/Neurobasis_chinensis_Charles_Lam.jpg',
  './images/Neurobasis_chinensis_Jkadavoor_Jee.jpg',
  './images/Neurobasis_chinensis_Pavel_Kirillov.jpg',
  './images/Neurothemis_fluctuans_csc.jpg',
  './images/Neurothemis_fluctuans_csc2.jpg',
  './images/Oligoaeschna_amata_csc.jpg',
  './images/Oligoaeschna_foliacea_keith_wilson1.jpg',
  './images/Oligoaeschna_foliacea_keith_wilson2.jpg',
  './images/Onychargia_atrocyana_wu_bird.jpg',
  './images/Onychargia_atrocyana_wu_bird2.jpg',
  './images/Onychothemis_testacea_Jkadavoor_Jee1.jpg',
  './images/Onychothemis_testacea_Jkadavoor_Jee2.jpg',
  './images/Onychothemis_testacea_Weiting_Liu.jpg',
  './images/Orchithemis_pruinans_Leonard_Tan.jpg',
  './images/Orchithemis_pruinans_Leonard_Tan2.jpg',
  './images/Orchithemis_pulcherrima_csc1.jpg',
  './images/Orchithemis_pulcherrima_csc2.jpg',
  './images/Orchithemis_pulcherrima_csc3_immature_male.jpg',
  './images/Orolestes_wallacei_Bernard_DUPONT.jpg',
  './images/Orolestes_wallacei_Keith_Wilson_1.jpg',
  './images/Orolestes_wallacei_Keith_Wilson_2.jpg',
  './images/Orthetrum_chrysis_csc.jpg',
  './images/Orthetrum_glaucum_keith_wilson.jpg',
  './images/Orthetrum_glaucum_vijay_anand_ismavel.jpg',
  './images/Orthetrum_luzonicum_csc.jpg',
  './images/Orthetrum_luzonicum_csc_f.jpg',
  './images/Orthetrum_luzonicum_csc_young_male.jpg',
  './images/Orthetrum_sabina_csc1.jpg',
  './images/Orthetrum_sabina_csc2.jpg',
  './images/Orthetrum_testaceum_csc.jpg',
  './images/Pantala_flavescens_csc.jpg',
  './images/Paragomphus_capricornis_csc.jpg',
  './images/Paragomphus_capricornis_keith_wilson1.jpg',
  './images/Paragomphus_capricornis_keith_wilson2.jpg',
  './images/Pericnemis_stictica_Lemon_f.jpg',
  './images/Pericnemis_stictica_Lemon_f2.jpg',
  './images/Pericnemis_stictica_Lemon_m.jpg',
  './images/Platylestes_heterostylus_Anthony_Quek.jpg',
  './images/Podolestes_orientalis_H._K._Tang_1.jpg',
  './images/Podolestes_orientalis_H._K._Tang_2.jpg',
  './images/Podolestes_orientalis_Keith_Wilson.jpg',
  './images/Pornothemis_starrei_Leonard_Tan.jpg',
  './images/Pornothemis_starrei_Leonard_Tan2.jpg',
  './images/Potamarcha_congener_csc.jpg',
  './images/Potamarcha_congener_csc2.jpg',
  './images/Prodasineura_collaris_H.K.Tang1.jpg',
  './images/Prodasineura_collaris_H.K.Tang2.jpg',
  './images/Prodasineura_collaris_csc.jpg',
  './images/Prodasineura_humeralis_keith_wilson1.jpg',
  './images/Prodasineura_humeralis_keith_wilson2.jpg',
  './images/Prodasineura_humeralis_keith_wilson_mating.jpg',
  './images/Prodasineura_interrupta_budak.jpg',
  './images/Prodasineura_notostigma_keith_wilson.jpg',
  './images/Pseudagrion_australasiae_H.K.Tang.jpg',
  './images/Pseudagrion_australasiae_david_cook.jpg',
  './images/Pseudagrion_microcephalum_Graham_Winterflood.jpg',
  './images/Pseudagrion_microcephalum_keith_wilson.jpg',
  './images/Pseudagrion_pruinosum_keith_wilson1.jpg',
  './images/Pseudagrion_pruinosum_keith_wilson2.jpg',
  './images/Pseudagrion_pruinosum_keith_wilson3.jpg',
  './images/Pseudagrion_rubriceps_gailhampshire1.jpg',
  './images/Pseudagrion_rubriceps_gailhampshire2.jpg',
  './images/Pseudagrion_rubriceps_gailhampshire3.jpg',
  './images/Pseudothemis_jorina_eddy_lee.jpg',
  './images/Raphismia_bispina_Lena_Chow_f.jpg',
  './images/Raphismia_bispina_Leonard_Tan.jpg',
  './images/Rhodothemis_rufa_csc.jpg',
  './images/Rhyothemis_Phyllis_csc.jpg',
  './images/Rhyothemis_obsolescens_Jonathan_Hiew_inet.jpg',
  './images/Rhyothemis_obsolescens_csc1.jpg',
  './images/Rhyothemis_obsolescens_csc2.jpg',
  './images/Rhyothemis_pygmaea_C.Y.Choong.jpg',
  './images/Rhyothemis_pygmaea_C.Y.Choong2.jpg',
  './images/Rhyothemis_triangularis_Jerry_Hsu.jpg',
  './images/Rhyothemis_triangularis_ccca.jpg',
  './images/Risiophlebia_dohrni_Anthony_Quek.jpg',
  './images/Risiophlebia_dohrni_Leonard_Tan.jpg',
  './images/Risiophlebia_dohrni_Leonard_Tan2.jpg',
  './images/Teinobasis_cryptica_C.Y.Choong.jpg',
  './images/Teinobasis_ruficollis_Michael_MK_Khor.jpg',
  './images/Teinobasis_ruficollis_m_ronnie_ang.jpg',
  './images/Teinobasis_ruficollis_ronnie_ang1.jpg',
  './images/Tetracanthagyna_plagiata_keith_wilson_f1.jpg',
  './images/Tetracanthagyna_plagiata_keith_wilson_f2.jpg',
  './images/Tetracanthagyna_plagiata_ronnie_ang_m.jpg',
  './images/Tetrathemis_irregularis_keith_wilson.jpg',
  './images/Tetrathemis_irregularis_keith_wilson_f.jpg',
  './images/Tholymis_tilIarga_Troup_Dresser_f.jpg',
  './images/Tholymis_tilIarga_vijay_anand_ismavel.jpg',
  './images/Tramea_transmarina_euryale_ccca.jpg',
  './images/Tramea_transmarina_euryale_wu_bird.jpg',
  './images/Trithemis_aurora_David_Cook.jpg',
  './images/Trithemis_aurora_Tarique_Sani.jpg',
  './images/Trithemis_aurora_Vipin_Baliga.jpg',
  './images/Trithemis_festiva_Jkadavoor_Jee.jpg',
  './images/Trithemis_festiva_Satish_Nikam.jpg',
  './images/Trithemis_festiva_gancw.jpg',
  './images/Trithemis_pallidinervis_csc.jpg',
  './images/Tyriobapta_torrida_csc.jpg',
  './images/Tyriobapta_torrida_csc2.jpg',
  './images/Urothemis_signata_csc.jpg',
  './images/Vestalis_amethystina_Keith_Wilson.jpg',
  './images/Vestalis_amoena_CW_Gan.jpg',
  './images/Vestalis_amoena_Keith_Wilson.jpg',
  './images/Vestalis_amoena_Keith_Wilson_2.jpg',
  './images/Zyxomma_obtusum_Ross_Tsai.jpg',
  './images/Zyxomma_obtusum_weiting_liu_f.jpg',
  './images/Zyxomma_obtusum_weiting_liu_m.jpg',
  './images/Zyxomma_petiolatum_csc.jpg',
  './images/aciagrion_hisopa_anthony_quek.jpg',
  './images/ajax-loader.gif',
  './images/anatomy.jpg',
  './images/anatomy2.jpg',
  './images/app_logo.png',
  './images/country_coastline.svg',
  './images/favicon.ico',
  './images/fblogo.png',
  './images/sponsor_logo.png',
  './images/startup.png',
  './images/unknown.png',
  './images/welcome_1.jpg',
  './images/welcome_2.jpg',
  './images/welcome_3.jpg',
  './images/welcome_4.jpg',
  './images/welcome_5.jpg',
  './index.html',
  './manifest.json',
  './scripts/data.js',
  './scripts/debug-errors.js',
  './scripts/libs/require.js',
  './scripts/libs/require.min.js',
  './scripts/main-built.js',
  './scripts/templates.js',
  './styles/error.gif',
  './styles/icons.png',
  './styles/icons@2x.png',
  './styles/images/ajax-loader.gif',
  './styles/loader.gif',
  './styles/main.min.css'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function (cache) {
      return cache.addAll(PRECACHE_URLS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) { return key !== CACHE_VERSION; })
          .map(function (key) { return caches.delete(key); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;

  if (request.method !== 'GET') {
    return;
  }

  var url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  // Navigations (e.g. opening the app fresh while offline) always fall back to the
  // cached shell, since routing inside the app is client-side (Backbone hash routes).
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then(function (cached) {
        return cached || fetch(request);
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(function (cached) {
      if (cached) {
        return cached;
      }
      return fetch(request).then(function (response) {
        if (response && response.ok) {
          var clone = response.clone();
          caches.open(CACHE_VERSION).then(function (cache) {
            cache.put(request, clone);
          });
        }
        return response;
      }).catch(function () {
        // No cache, no network: nothing we can do for this asset.
        return cached;
      });
    })
  );
});
