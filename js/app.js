$(function() {
  var Torrent = Backbone.Model.extend({
    urlRoot: "http://dev.jishaku.net/api/torrent",
    parse: function(response) {
      var o = response._source;
      o.date = new Date(o.date);
      o.id = o._id;
      delete o._id;
      return o;
    },
  });

  var TorrentCollection = Backbone.Collection.extend({
    model: Torrent,
    url: "http://dev.jishaku.net/api/torrent",
    parse: function(response) {
      return response.hits.hits;
    },
  });

  var LoadingView = Backbone.View.extend({
    tagName: "img",
    render: function() {
      this.$el.attr("src", "/img/loading.gif");
      this.$el.css({
        position: "absolute",
        left: "50%",
        "margin-left": "-110px",
        top: "50%",
        "margin-top": "-10px",
      });
      return this;
    },
  });

  var SearchView = Backbone.View.extend({
    tagName: "table",
    className: "table table-striped table-condensed table-hover torrents",
    initialize: function(options) {
      this.tbody = document.createElement("tbody");

      DOMinate([
        this.el,
        ["thead",
          ["tr",
            ["th", "Links"],
            ["th", {width: "100%"}, "Name"],
            ["th", "Time"],
            ["th", "Size"]
          ]
        ],
        [this.tbody]
      ]);

      this.searchRowViews = [];
      this.torrentCollection = options.torrentCollection;
      this.torrentCollection.bind("add", this.addOne, this);
      this.torrentCollection.bind("reset", this.resetAll, this);
      this.torrentCollection.bind("remove", this.removeOne, this);
    },
    addOne: function(torrent) {
      var searchRowView = new SearchRowView({model: torrent});
      this.searchRowViews.push(searchRowView);
      $(this.tbody).append(searchRowView.render().el);
    },
    resetAll: function() {
      this.searchRowViews.forEach(function(searchRowView) { searchRowView.remove(); });
      this.torrentCollection.each(this.addOne.bind(this));
    },
    removeOne: function(removed) {
      _.each(this.searchRowViews, function(v, k) {
        if (v.model === removed) {
          v.remove();
          this.searchRowViews.splice(k, 1);
        }
      }.bind(this));
    },
    render: function() {
      this.resetAll();
      return this;
    },
  });

  var SearchRowView = Backbone.View.extend({
    tagName: "tr",
    initialize: function() {
      this.model.on("change", this.render.bind(this));
/*
      setInterval(function() {
        if (this.model.has("date")) {
          var new_time = vagueTime.get({from: this.model.get("date").valueOf() / 1000});

          if (new_time !== this.$el.find("abbr.time")) {
            this.$el.find("abbr.time").text(new_time);
          }
        }
      }.bind(this), 1000);
*/
    },
    render: function() {
      DOMinate([
        this.el,
        ["td",
          ["a", {href: "magnet:?" + ["xt=urn:btih:" + this.model.get("id"), "dn=" + encodeURIComponent(this.model.get("name"))].join("&")}, ["img", {src: "/img/magnet.png"}]]
        ].concat(this.model.has("website") ? [["a", {href: this.model.get("website")}, ["img", {src: "/img/link.png"}]]] : []),
        ["td", ["a", {href: "#details/" + this.model.get("id")}, ["span", {class: "name"}, this.model.get("name")]]],
        ["td", ["abbr", {class: "time", title: this.model.has("date") ? this.model.get("date").toISOString() : "unknown"}, this.model.has("date") ? vagueTime.get({from: this.model.get("date").valueOf() / 1000}) : "unknown"]],
        ["td", ["abbr", {class: "size", title: this.model.has("size") ? this.model.get("size").toString() : "unknown"}, this.model.has("size") ? filesize(this.model.get("size")) : "unknown"]]
      ]);
      return this;
    },
  });
  
  var DetailsView = Backbone.View.extend({
    tagName: "div",
    initialize: function() {
      this.model.on("change", this.render.bind(this));
    },
    render: function() {
      DOMinate([
        this.el,
        ["div",
          ["a", {href: "magnet:?" + ["xt=urn:btih:" + this.model.get("id"), "dn=" + encodeURIComponent(this.model.get("name"))].join("&")}, ["img", {src: "/img/magnet.png"}]]
        ].concat(this.model.has("website") ? [["a", {href: this.model.get("website")}, ["img", {src: "/img/link.png"}]]] : []),
        ["div", ["a", {href: "#details/" + this.model.get("id")}, ["span", {class: "name"}, this.model.has("name") ? this.model.get("name") : "unknown"]]],
        ["div", ["abbr", {class: "time", title: this.model.has("date") ? this.model.get("date").toISOString() : "unknown"}, this.model.has("date") ? vagueTime.get({from: this.model.get("date").valueOf() / 1000}) : "unknown"]],
        ["div", ["abbr", {class: "size", title: this.model.has("size") ? this.model.get("size").toString() : "unknown"}, this.model.has("size") ? filesize(this.model.get("size")) : "unknown"]]
      ]);
      return this;
    },
  });

  var HeaderView = Backbone.View.extend({
    tagName: "div",
    className: "navbar navbar-fixed-top",
    initialize: function(options) {
      this.headerSearchView = options.headerSearchView;
    },
    render: function() {
      DOMinate([
        this.el,
        ["div", {class: "navbar-inner"},
          ["div", {class: "container-fluid"},
            ["a", {class: "brand", href: "/"}, "Torrents"],
            ["ul", {class: "nav"}],
            [this.headerSearchView.render().el]
          ]
        ]
      ]);
      return this;
    },
  });

  var HeaderSearchView = Backbone.View.extend({
    tagName: "form",
    className: "navbar-search pull-right",
    initialize: function() {
      this.$el.on("submit", function() {
        this.trigger("search", this.$el.find("input[type=text]").val());
        return false;
      }.bind(this));
    },
    render: function() {
      DOMinate([
        this.el,
        ["input", {type: "text", class: "search-query input-xlarge", placeholder: "Search..."}]
      ]);
      return this;
    },
  });

  var ContentView = Backbone.View.extend({
    tagName: "div",
    className: "container-fluid",
    render: function(view) {
      this.$el.empty();
      if (view) { this.view = view; }

      DOMinate([
        this.el,
        ["div", {class: "row-fluid"},
          ["div", {class: "span12"},
            [this.view ? this.view.render().el : "div"]
          ]
        ]
      ]);
      return this;
    },
  });

  var AppView = Backbone.View.extend({
    tagName: "div",
    initialize: function(options) {
      this.headerView = options.headerView;
      this.contentView = options.contentView;
    },
    render: function() {
      DOMinate([
        this.el,
        [this.headerView.render().el],
        [this.contentView.render().el]
      ]);
      return this;
    },
  });

  function App() {
    this.headerSearchView = new HeaderSearchView();
    this.headerView = new HeaderView({headerSearchView: this.headerSearchView});
    this.contentView = new ContentView();

    this.appView = new AppView({
      headerView: this.headerView,
      contentView: this.contentView,
    });

    this.router = new Backbone.Router();

    this.router.route(/^(:?search)?(\?.*)?$/, "search", function(name, params) {
      this.contentView.render(new LoadingView());

      var torrentCollection = new TorrentCollection();
      var searchView = new SearchView({torrentCollection: torrentCollection});

      var parameters = {
        sort: "date:desc",
        size: 100,
      };

      if (params && params.q) {
        parameters.q = params.q;
      }

      torrentCollection.fetch({
        data: parameters,
        success: function() {
          this.contentView.render(searchView);
        }.bind(this),
      });
    }.bind(this));

    this.router.route(/^details\/([a-f0-9]{40})$/, "details", function(hash) {
      this.contentView.render(new LoadingView());
      
      var torrent = new Torrent({id: hash});

      torrent.fetch({
        success: function() {
          this.contentView.render(new DetailsView({model: torrent}));
        }.bind(this),
      });
    }.bind(this));

    Backbone.history.start({pushState: false});

    this.headerSearchView.on("search", function(query) {
      this.router.navigate("search" + (query && "?q=" + encodeURIComponent(query)), {trigger: true});
    }.bind(this));

    this.appView.$el.appendTo(document.body);
    this.appView.render();
  };

  var app = new App(document.body);

  $("#loading").remove();
}());
