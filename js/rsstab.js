(function($) {

    /**
     * Rsstab class
     * @param elem jquery element (1 instance » 1 element group)
     * @param limit rss items limit (default 10)
     * @constructor
     */
    Rsstab = function(elem, limit) {
        //Class vars
        this._elem = elem;
        //For cookie
        if(typeof this._elem.attr('id') === ' undefined') this._elem.attr('id', 'rsstab');
        this._header = this._elem.children('header');
        this._content = this._elem.children('.content');
        this._editor = this._elem.children('.editor');
        this._loader = this._elem.children('.loader');

        this.limit = limit || 10;

        this.editorHandler();
        this.tabHandler();
        this.contentHandler();
        this.cookieHandler();
    };

    /**
     * Cookie factory
     * @type {Object}
     */
    Rsstab.prototype.cookie = {
        Set: function(name,value,days) {
            var date,
                expires;
            if (days) {
                date = new Date();
                date.setTime(date.getTime()+(days*24*60*60*1000));
                expires = "; expires="+date.toGMTString();
            }
            else expires = "";
            document.cookie = name+"="+value+expires+"; path=/";
        },
        Get: function(name) {
            var nameEQ = name + "=",
                ca = document.cookie.split(';'),
                i = 0,
                c;
            for(;i < ca.length;i++) {
                c = ca[i]
                while (c.charAt(0)==' ') c = c.substring(1,c.length);
                if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
            }
            return null;
        }
    };

    /**
     * Editor handler
     */
    Rsstab.prototype.editorHandler = function() {
        var me = this,
            cookieUrls,
            i = 0,
            tabTemplate = '<h3><a href="#" class="tab" title="${Value}">${Value}<span class="edit">✎</span><span class="delete">✖</span></a></h3>',
            rssSuccess = function(edit, url) {
                var url = url || me._editor.val(),
                    tab = $(tabTemplate.replace(/\$\{Value\}/g, url));

                /* Set data url */
                tab.data('url', url);

                /* Add */
                if(typeof edit === 'undefined') {
                    /* Append tab */
                    me._header.append(tab[0]);
                }
                /* Edit */
                else {
                    /* Replace tab */
                    me._header.children(':eq(' + edit + ')').replaceWith(tab[0]);
                }

                /* For css3 transition */
                setTimeout(function() { tab.addClass('show'); }, 10);
            },
            rssLoaded = function(success) {
                /* Success */
                if(success) {
                    /* Edit end */
                    $(this).removeData('edit').html('⊕');

                    /* Clear editor */
                    me._editor.val('');

                    /* Enable panel */
                    me._elem.removeClass('closed');

                    me._editor.removeClass('error');
                }
                /* Failed */
                else me._editor.addClass('error');
            };

        /* Add button handler */
        this._elem.on('click', '.add', function(e) {
            e.preventDefault();

            /* Empty editor, close */
            if(me._editor.val() === '') {
                //Only for edit
                if(typeof $(this).data('edit') !== 'undefined') rssLoaded.call(this, true);
                return;
            }

            /* Show loader */
            me._loader.show();

            /* Validate */
            $.ajax({
                url: 'http://query.yahooapis.com/v1/public/yql?q=' + encodeURIComponent('select title from rss where url = "' + me._editor.val() +'" limit ' + me.limit + '') + '&format=json',
                success: function(root) {
                    var items = root.query.results ? root.query.results.item : root.query.results;

                    /* Success */
                    if(items && items[0]) {
                        rssSuccess.call(this, $(this).data('edit'));
                        rssLoaded.call(this, true);
                    /* Failed */
                    } else {
                        rssLoaded.call(this, false);
                    }

                    /* Hide loader */
                    me._loader.hide();
                },
                error: function() {
                    rssLoaded.call(this, false);

                    /* Hide loader */
                    me._loader.hide();
                },
                dataType: 'jsonp',
                context: this
            });

        });

        /* Load data from cookie */
        cookieUrls = me.cookie.Get(me._elem.attr('id'));
        if(cookieUrls !== null && cookieUrls !== '') {
            cookieUrls = cookieUrls.split(',');
            for(; i < cookieUrls.length; i++) {
                rssSuccess(undefined, cookieUrls[i]);
                rssLoaded.call(this._elem.find('.add')[0], true);
            }
        }
    };

    /**
     * Tab handler
     */
    Rsstab.prototype.tabHandler = function() {
        var me = this,
            toogle = function() {
                if($(this).hasClass('active')){
                    $(this).removeClass('active');
                    me._content.removeClass('active');
                    me._content.removeData('items');
                }
                else {
                    me.showItems($(this).data('url'), function() {
                        me._header.children('.active').removeClass('active');
                        $(this).addClass('active');
                        me._content.addClass('active');
                    }, this);
                }
            },
            startEdit = function() {
                /* Disable panel */
                me._elem.addClass('closed');

                /* Change to edit mode */
                me._elem.find('.add').data('edit', $(this).index()).html('✎');
                me._content.removeClass('active');

                /* Load url back */
                me._editor.val($(this).data('url'));
            },
            startDelete = function() {
                if($(this).hasClass('active')) me._content.removeClass('active');
                /* Remove element*/
                $(this).remove();
                /* If empty then close */
                if(typeof me._elem.find('header h3')[0] === 'undefined') me._elem.addClass('closed');
            };
        this._elem.on('click', 'header h3', function(e) {
            e.preventDefault();
            if(e.target.className === 'tab') toogle.call(this);
            else if(e.target.className === 'edit') startEdit.call(this);
            else if(e.target.className === 'delete') startDelete.call(this);
        });
    };

    /**
     * Show rss items
     */
    Rsstab.prototype.showItems = function(url, callback, context) {
        var me = this,
            error = function() {
                me._content.html('<h2>Failed rss, please refresh url!</h2>');
            },
            success = function(items) {
                var i = 0,
                    data = '';

                for(; i < items.length; i++) {
                    data += '<li><a href="' + $('<div />').html(items[i].link).text() + '" target="_blank">' + $('<div />').html(items[i].title).text() + '</a><section></section></li>';
                }

                data = '<ul>' + data + '</ul>';

                me._content.html(data);

                callback.call(context);
            };

        $.ajax({
            url: 'http://query.yahooapis.com/v1/public/yql?q=' + encodeURIComponent('select * from rss where url = "' + url +'" limit ' + me.limit + '') + '&format=json',
            success: function(root) {
                var items = root.query.results ? root.query.results.item : root.query.results;

                /* Success */
                if(items && items[0]) {
                    success(items);
                    /* Cache */
                    me._content.data('items', items);
                /* Failed */
                } else {
                    error();
                }

            },
            error: function() {
                error();
            },
            dataType: 'jsonp',
            context: this
        });
    };

    /**
     * Content handler
     */
    Rsstab.prototype.contentHandler = function() {
        var me = this;
        /* Details */
        this._content.on('click', 'li section', function(e) {
            /* Get from cache */
            var item = me._content.data('items')[$(this).parent().index()],
                raw = $('<div />').html(item.description).text(),
                imgPattern = /img.*?src="(http:\/\/.*?)"/im,
                content = $('<div />').html(raw).text();

            imgResult = imgPattern.exec(raw);
            if(imgResult && imgResult[2]) content = '<img src="' + imgResult[2] + '" />' + content;

            $(this).html(content).toggleClass('active');
        });
    };

    /**
     * Cookie handler (Save)
     */
    Rsstab.prototype.cookieHandler = function() {
        var me = this;
        this._elem.on('click', '.save', function(e) {
            var i = 0,
                tabs = me._header.children(),
                urls = [];
            e.preventDefault();

            for(; i < tabs.length; i++) {
                urls.push($(tabs[i]).data('url'));
            }

            me.cookie.Set(me._elem.attr('id'), urls.toString(), 365);
        });
    };

})(jQuery);