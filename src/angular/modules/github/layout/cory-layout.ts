import {
    Component,
    Injectable,
    ViewEncapsulation,
    ViewChild,
    NgZone,
    OnInit,
    ElementRef,
} from '@angular/core';

import {
    ActivatedRoute,
} from '@angular/router';

import {debounce} from 'lodash'

import {
    MatSidenav
} from '@angular/material/sidenav'

import {
    RouterService,
} from 'corifeus-web';

import {HttpClient} from '@angular/common/http';



import {LocaleService, LocaleSubject, SettingsService} from 'corifeus-web';
import {NotifyService} from 'corifeus-web-material';

import {extractTitle} from '../utils/extrac-title';
import {extractTitleWithStars} from '../utils/extrac-title';
import {isMobile} from '../utils/is-mobile';
//import {clearTimeout} from "timers";

import {
    DomSanitizer,
} from '@angular/platform-browser';


const twemoji = require('twemoji').default;

declare global {
    interface Window {
        coryAppWebPagesNavigate: any,
        coryAppWebPagesNavigateHash: any,
    }
}


@Component({
    selector: 'cory-layout',
    templateUrl: 'cory-layout.html',
    encapsulation: ViewEncapsulation.None
})

@Injectable()
export class Layout implements OnInit {

    private debounceSearchText: Function;

    menuMenuActive: any;
    menuRepoActive: any

    searchText: string;

    extractTitle = extractTitle;

    @ViewChild('menuSidenav', {read: MatSidenav, static: false})
    public menuSidenav: MatSidenav;

    @ViewChild('searchText', {read: ElementRef, static: false})
    public searchTextInput: ElementRef;

    currentRepo: string;

    body = document.getElementsByTagName('body')[0];

    i18n: any;
    config: any;

    repos: any[];

    packages: any;

    settings: any;

    packageJson: any = {
        version: undefined,
        corifeus: {
            ['time-stamp']: undefined,
            code: '',
            publish: false,
        }
    }

    title: string;
    icon: string;



    noScript: any;

    public isMobile: boolean = false;

    constructor(
        private router: RouterService,
        private route: ActivatedRoute,
        protected notify: NotifyService,
        private http: HttpClient,
        protected locale: LocaleService,
        protected settingsAll: SettingsService,
        private zone: NgZone,
        private sanitizer: DomSanitizer,
    ) {

        this.isMobile = isMobile();
        this.settings = settingsAll.data.pages;
        this.currentRepo = this.settings.github.defaultRepo;

        this.locale.subscribe((data: LocaleSubject) => {
            this.i18n = data.locale.data.pages;
        });

        this.noScript = document.getElementById('cory-seo');

        this.route.params.subscribe((params) => {
            this.currentRepo = params.repo
            if (params.repo === undefined) {
                this.currentRepo = this.settings.github.defaultRepo;
            }
            this.load();
            /*
            if (!location.pathname.endsWith('.html')) {
                this.navigate();
            }
            */
        })
    }

    ngOnInit() {
        this.debounceSearchText = debounce(this.handleSearch, this.settings.debounce.default)
    }

    handleSearch(searchText: string) {
        this.searchText = searchText.trim();
    }

    get reposSearch(): Array<any> {
        if (this.searchText === '' || this.searchText === undefined) {
            return this.repos;
        }
        const regexes: Array<RegExp> = [];
        this.searchText.split(/[\s,]+/).forEach(search => {
            if (search === '') {
                return;
            }
            regexes.push(
                new RegExp('.*' + search + '.*', 'i')
            )
        })
        return this.repos.filter(repo => {
            let found = false;
            for (let regex of regexes) {
                if (regex.test(repo)) {
                    found = true;
                    break;
                }
            }
            return found;
        })
    }

    async load() {
        if (this.packages === undefined) {
            const response: any = await this.http.get(this.settings.p3x.git.url).toPromise()
            this.packages = response.repo;

            let sortedObject = {}
            sortedObject = Object.keys(this.packages).sort((a, b) => {
                return this.packages[b].corifeus.stargazers_count - this.packages[a].corifeus.stargazers_count
            }).reduce((prev, curr, i) => {
                prev[i] = this.packages[curr]
                return prev
            }, {})
            this.packages = {};
            Object.keys(sortedObject).forEach(key => {
                const item = sortedObject[key]
                if (item.corifeus.prefix !== undefined) {
                    this.packages[item.name.substr(item.corifeus.prefix.length)] = item;
                } else {
                    this.packages[item.name] = item;
                }
            })

            this.repos = Object.keys(this.packages);
        }
        if (!this.packages.hasOwnProperty(this.currentRepo)) {
            this.currentRepo = 'corifeus';
        }
        this.packageJson = this.packages[this.currentRepo];
        this.title = this.packageJson.description;
        this.icon = this.packageJson.corifeus.icon !== undefined ? `${this.packageJson.corifeus.icon}` : 'fas fa-bolt';
        document.title = this.title;
        this.noScript.innerHTML = '';
        this.repos.forEach((repo: any) => {
            const a = document.createElement('a');
            a.href = `/${repo}`;
            a.innerText = repo;
            this.noScript.appendChild(a)
            const a2 = document.createElement('a');
            a2.href = `https://github.com/patrikx3/${repo}`;
            a2.innerText = 'Github ' + repo;
            this.noScript.appendChild(a2)
        })
        window.coryAppWebPagesNavigate = (path?: string) => {
            this.zone.run(() => {
                if (path.includes('#')) {
                    const hashIndex = path.indexOf('#')
                    const pathMainPath = path.substring(0, hashIndex)
                    const hash = path.substring(hashIndex + 1)
                    this.navigate(pathMainPath);
                    window.coryAppWebPagesNavigateHash(hash)
                } else {
                    this.navigate(path);
                }
            });
        };

        window.coryAppWebPagesNavigateHash = (id: any) => {

            const scroll = (id: string) => {
                const el = document.getElementById(id);

                if (el === null) {
                    return;
                }
                el.scrollIntoView({
                    block: "center",
                })
            }

            if (typeof id === 'string') {
                const hash = `#${id.replace(/-parent$/, '')}`;
                if (history.pushState) {
                    history.pushState(null, null, `${location.pathname}${hash}`);
                } else {
                    location.hash = hash;
                }

                scroll(id);
            } else {
                id = `${id.id}`;
                setTimeout(() => {
                    scroll(id)
                }, 500)
            }

            return false;
        }
    }

    async navigate(path?: string) {
        if (path === undefined) {
            path = `github/${this.currentRepo}/index.html`;
        }
        this.menuMenuActive = '';
//console.log('cory-layout', path);
        this.router.navigateTop([path]);
    }

    isOpenWrt() {
        return this.packageJson !== undefined && this.packageJson.corifeus !== undefined && this.packageJson.corifeus.hasOwnProperty('type') && this.packageJson.corifeus.type === 'openwrt';
    }

    packageMenuClose() {
//        this.body.style.overflowY = 'auto';
        this.menuSidenav.close();
    }


    packageMenuOpen() {
//        this.body.style.overflowY = 'hidden';
        this.menuSidenav.open();
        setTimeout(() => {
            if (this.isMobile) {
                this.searchTextInput.nativeElement.blur()
            }

//            /**
            const e = document.querySelector('.cory-mat-menu-item-active')
            if (e) {
//                e.scrollIntoView(true);
//                const viewportH = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
//                window.scrollBy(0, (e.getBoundingClientRect().height-viewportH)/2);
                e.scrollIntoView({
                    block: "center",
                });
            }
//             **/

        }, 500)
    }

    search(searchText: string) {
        this.debounceSearchText(searchText);
    }

    getDescription(title: string) {
        return !title ? title : this.sanitizer.bypassSecurityTrustHtml(twemoji.parse(title, {
            folder: 'svg',
            ext: '.svg',
        }))
    }

    renderTwemoji(text: string) {
        return !text ? text : this.sanitizer.bypassSecurityTrustHtml(twemoji.parse(text, {
            folder: 'svg',
            ext: '.svg',
        }))
    }

    keyDownFunction(event: any) {
        const repos = this.reposSearch;
        if (event.keyCode == 13 && repos.length === 1) {
            this.zone.run(() => {
                const navigate = `github/${repos[0]}/index.html`
                this.debounceSearchText('');
                this.searchTextInput.nativeElement.blur()
                this.searchTextInput.nativeElement.value = '';
                this.packageMenuClose();
                this.navigate(navigate);
            });
        }
    }

    get showTitle() {
        const showTitle = location.pathname.endsWith('index.html') || (!location.pathname.includes('.') && !location.pathname.includes('open-collective'));
        return showTitle;
    }

    get counter() {
        return window.corifeus.core.http.counter;
    }

    extractTitleWithStars(pkg: any) {
        const title = extractTitleWithStars(pkg);
        return title;
    }

}