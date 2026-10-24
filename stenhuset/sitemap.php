<?php
/* sitemap for the Stenhuset pages (from seo-config.php). Submit it in Search Console when INDEXABLE is turned on. */
require __DIR__.'/seo-config.php';
header('Content-Type: application/xml; charset=utf-8');
if(!INDEXABLE)header('X-Robots-Tag: noindex');
echo '<?xml version="1.0" encoding="UTF-8"?>'."\n".'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'."\n";
foreach(PAGES as $slug=>$p){
  echo '<url><loc>'.htmlspecialchars(CANONICAL_BASE.($slug!==''?$slug.'/':''),ENT_XML1).'</loc><lastmod>'.gmdate('Y-m-d',max(@filemtime(__DIR__.'/app.html'),@filemtime(__DIR__.'/seo-config.php'))).'</lastmod></url>'."\n";
}
echo '</urlset>'."\n";
