export default class AutocompleteDropdown {
    constructor({el, options = [], className = 'gu-ac', placeholder = ''}) {
        this.el = el;
        this.className = className;
        this.placeholder = placeholder;
        this.el.innerHTML = this.HTML;
        this.els = {};
        this.initBindings()
        if (options && options.length) this.loadOptions(options);
    }

    getEl(name) {
        return this.els[name] = this.els[name] || this.el.querySelector(`.${this.className}__${name}`);
    }

    loadOptions(options) {
        this.options = options;
        this.callbacks = {}; options.map(opt => this.callbacks[opt.text] = opt.callback)
    }

    show() { this.getEl('list').style.display = 'block'; }
    hide() {
        this.getEl('list').style.display = 'none';
        this.focusedEl = null;
    }

    selectEl(el) {
        this.callbacks[el.textContent]();
        this.getEl('input').value = '';
        this.hide();
    }


    initBindings() {
        var isMatch = (opt, search) => {
            var hits = search.split(' ').map(word =>  (new RegExp(word, 'i')).test(opt.text))
            return hits.indexOf(false) === -1;

        }
        this.getEl('input').addEventListener('keydown', e => {
            var newEl;
            if (e.keyCode === 40) {// down
                newEl = this.focusedEl ?
                    this.focusedEl.nextSibling || this.getEl('list').firstChild : // next or loop
                    this.getEl('list').firstChild; // first item if nothing is selected
            } else if (e.keyCode === 38) { // up
                newEl = this.focusedEl ?
                    this.focusedEl.previousSibling || this.getEl('list').lastChild : // prev or loop
                    this.getEl('list').lastChild; // last item if nothing is selected
            } else if (e.keyCode === 13) {
                if (this.focusedEl) this.selectEl(this.focusedEl);
            }
            if (newEl) {
                var selectedClassName = `${this.className}__item--selected`;
                if (this.focusedEl) this.focusedEl.classList.remove(selectedClassName);
                newEl.classList.add(selectedClassName);
                this.focusedEl = newEl;
            }
        })
        this.getEl('input').addEventListener('keyup', e => {
            var search = e.target.value;
            if (search) {
                if (search !== this.lastSearch) {
                    this.getEl('list').innerHTML = this.options
                        .filter(opt => isMatch(opt, search))
                        .slice(0,12).map(this.elHtml.bind(this)).join('')
                    this.show();
                }
                this.lastSearch = search;

            } else this.hide();
        })
        this.getEl('list').addEventListener('click', e => {
            if (e.target.tagName.toLowerCase() === 'li') {
                this.selectEl(e.target);
            }
        })
    }

    elHtml(option) { return `<li class="${this.className}__item">${option.text}</li>` }

    get HTML() { return `
        <div class="${this.className}">
            <input class="${this.className}__input" type="text" placeholder="${this.placeholder}"></input>
            <div class="${this.className}__container"></div>
            <ul style="display: none;" class="${this.className}__list"></li>
        </div>`
    }
}