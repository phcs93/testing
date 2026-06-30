const fs = require("fs");
const path = require("path");

const langs = ["en", "pt"];

function CreateBinFolder() {

    if (fs.existsSync("bin")) {
        fs.rmSync("bin", { recursive: true, force: true });
    }

    fs.mkdirSync("bin");

}

function CopyCommonFiles() {

    fs.cpSync(`lib`, `bin/$common/lib`, { recursive: true });
    fs.cpSync(`res`, `bin/$common/res`, { recursive: true });
    fs.cpSync(`src`, `bin/$common/src`, { recursive: true });

    // we will move the pages to each corresponding lang folder
    fs.rmSync(`bin/$common/src/pages`, { recursive: true, force: true });

}

function CopyPagesToLangFolders() {

    function copyPages(src, dst, lang) {

        function walk(currentSrc) {

            const entries = fs.readdirSync(currentSrc, { withFileTypes: true });

            for (const entry of entries) {

                const srcFile = currentSrc + "/" + entry.name;

                if (entry.isDirectory()) {
                    walk(srcFile);
                    continue;
                }

                const relative = srcFile.replace("{lang}", lang).substring(src.length + 1);

                const dot = relative.lastIndexOf(".");
                const ext = relative.substring(dot);
                const withoutExt = relative.substring(0, dot);

                if (!withoutExt.endsWith("index")) {
                    const dstFile = dst + "/" + withoutExt + "/index" + ext;                
                    const dir = dstFile.substring(0, dstFile.lastIndexOf("/"));
                    fs.mkdirSync(dir, { recursive: true });
                    fs.copyFileSync(srcFile, dstFile);
                } else {
                    const dstFile = dst + "/" + withoutExt + ext;
                    fs.copyFileSync(srcFile, dstFile);
                }

            }

        }

        walk(src);

    }

    for (const lang of langs) {
        copyPages(`src/pages`, "bin", lang);
    }

}

function FilterLangTags() {

    const filter = (html, lang) => {
        return html
            .replace(new RegExp(`\\{lang\\}`, 'gi'), lang)
            .replace(new RegExp(`<([a-z0-9]+)\\b[^>]*\\blang="(?!${lang}")[^"]+"[^>]*>[\\s\\S]*?<\\/\\1>`, 'gi'), '')
            .replace(new RegExp(`<([a-z0-9]+)\\b[^>]*\\blang="(?!${lang}")[^"]+"[^>]*\\/?>`, 'gi'), '')
            .replace(new RegExp(`(<(?!html)[a-z0-9]+\\b[^>]*)(\\s+lang="[^"]+")([^>]*>)`, 'gi'), '$1$3')
        ;
    };

    const walk = (currentSrc, lang) => {
        for (const entry of fs.readdirSync(currentSrc, { withFileTypes: true })) {
            if (entry.isDirectory()) {
                walk(currentSrc + "/" + entry.name, lang);
            } else {
                const srcFile = currentSrc + "/" + entry.name;
                const html = fs.readFileSync(srcFile, "utf-8");
                const filteredHtml = filter(html, lang);
                fs.writeFileSync(srcFile, filteredHtml, "utf-8");
            }
        }
    }

    for (const lang of langs) {
        walk(`bin/${lang}`, lang);
    }

}

function AddCommonIndexHtml() {

    const walk = (currentSrc, depth) => {
        const entries = fs.readdirSync(currentSrc, { withFileTypes: true });

        for (const entry of entries) {
            const srcFile = currentSrc + "/" + entry.name;

            if (entry.isDirectory()) {
                walk(srcFile, depth + 1);
                continue;
            }

            // Check if the file is an HTML file
            if (entry.name.endsWith(".html") && depth > 0) {
                // get content of common index.html
                const commonIndexHtml = fs.readFileSync("index.html", "utf-8");
                // get content of current html file
                const currentHtml = fs.readFileSync(srcFile, "utf-8");
                // replace the content of current html file with common index.html content
                const replacedHtml = commonIndexHtml.replace("{content}", currentHtml);
                fs.writeFileSync(srcFile, replacedHtml, "utf-8");
            }
        }
    };

    walk("bin", 0);

}

function ReplaceCommonPath() {

    const walk = (currentSrc) => {

        const entries = fs.readdirSync(currentSrc, { withFileTypes: true });

        for (const entry of entries) {

            const srcFile = currentSrc + "/" + entry.name;

            if (entry.isDirectory()) {
                walk(srcFile);
                continue;
            }

            const html = fs.readFileSync(srcFile, "utf-8");
            // this should be replace with the relative path to $common folder in the root depending on the depth of the current file
            const relativePath = path.relative(path.dirname(srcFile), "$common");
            const replacedHtml = html.replace(/\{\$common\}/g, relativePath);
            fs.writeFileSync(srcFile, replacedHtml, "utf-8");

        }

    };

    walk("bin");

}

CreateBinFolder();
CopyCommonFiles();
CopyPagesToLangFolders();
AddCommonIndexHtml();
FilterLangTags();
ReplaceCommonPath();