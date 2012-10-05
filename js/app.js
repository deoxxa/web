$(function() {
  var Torrent = Backbone.Model.extend({
    defaults: function() {
      return {
        id: Math.round(Math.random() * 100000),
        name: ["Untitled", Math.random()].join(" "),
        date: new Date(),
        size: Math.round(Math.random() * 10000000),
      };
    },
    initialize: function(options) {
      var date = this.get("date");
      if (typeof date === "string") {
        this.set("date", new Date(date));
      }
    },
  });

  var TorrentView = Backbone.View.extend({
    tagName: "tr",
    initialize: function() {
      this.model.on("change", this.render, this);

      setInterval(function() {
        var new_time = vagueTime.get({from: this.model.get("date").valueOf() / 1000});

        if (new_time !== this.$el.find("abbr.time")) {
          this.$el.find("abbr.time").text(new_time);
        }
      }.bind(this), 1000);
    },
    render: function() {
      DOMinate([
        this.el,
        ["td", ["a", {href: "magnet:?" + ["xt=urn:btih:" + this.model.get("_id"), "dn=" + encodeURIComponent(this.model.get("name"))].join("&")}, ["span", {class: "name"}, this.model.get("name")]]],
        ["td", ["abbr", {class: "time", title: this.model.get("date").toISOString()}, vagueTime.get({from: this.model.get("date").valueOf() / 1000})]],
        ["td", ["abbr", {class: "size", title: this.model.get("size").toString()}, filesize(this.model.get("size"))]]
      ]);
      return this;
    },
  });

  var TorrentCollection = Backbone.Collection.extend({
    model: Torrent,
    url: "/api/torrent",
    parse: function(response) {
      return response.hits.hits.map(function(e) { return e._source; });
    },
  });

  var TorrentCollectionView = Backbone.View.extend({
    tagName: "table",
    className: "table table-striped table-condensed table-hover torrents",
    initialize: function(options) {
      this.tbody = document.createElement("tbody");

      DOMinate([
        this.el,
        ["thead",
          ["tr",
            ["th", {width: "100%"}, "Name"],
            ["th", "Time"],
            ["th", "Size"]
          ]
        ],
        [this.tbody]
      ]);

      this.torrentViews = [];
      this.torrentCollection = options.torrentCollection;
      this.torrentCollection.bind("add", this.addOne, this);
      this.torrentCollection.bind("reset", this.resetAll, this);
      this.torrentCollection.bind("remove", this.removeOne, this);
    },
    addOne: function(torrent) {
      var torrentView = new TorrentView({model: torrent});
      this.torrentViews.push(torrentView);
      $(this.tbody).append(torrentView.render().el);
    },
    resetAll: function() {
      this.torrentViews.forEach(function(torrentView) { torrentView.remove(); });
      this.torrentCollection.each(this.addOne.bind(this));
    },
    removeOne: function(removed) {
      _.each(this.torrentViews, function(v, k) {
        if (v.model === removed) {
          v.remove();
          this.torrentViews.splice(k, 1);
        }
      }.bind(this));
    },
    render: function() {
      this.resetAll();
      return this;
    },
  });

  var HeaderView = Backbone.View.extend({
    tagName: "div",
    className: "navbar navbar-fixed-top",
    initialize: function() {
      this.searchView = new SearchView();
      this.searchView.on("search", this.trigger.bind(this, "search"));
    },
    render: function() {
      DOMinate([
        this.el,
        ["div", {class: "navbar-inner"},
          ["div", {class: "container-fluid"},
            ["a", {class: "brand", href: "#"}, "Torrents"],
            ["ul", {class: "nav"}],
            [this.searchView.render().el]
          ]
        ]
      ]);
      return this;
    },
  });

  var SearchView = Backbone.View.extend({
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
      this.$el.trigger("submit");
      return this;
    },
  });

  var ContentView = Backbone.View.extend({
    tagName: "div",
    className: "container-fluid",
    initialize: function(options) {
      this.torrentCollection = options.torrentCollection;
      this.torrentCollectionView = new TorrentCollectionView({
        torrentCollection: this.torrentCollection,
      });
    },
    render: function() {
      DOMinate([
        this.el,
        ["div", {class: "row-fluid"}, ["div", {class: "span12"}, [this.torrentCollectionView.render().el]]]
      ]);
      return this;
    },
  });

  var AppView = Backbone.View.extend({
    tagName: "div",
    initialize: function(options) {
      this.torrentCollection = new TorrentCollection();

      this.contentView = new ContentView({
        torrentCollection: this.torrentCollection,
      });

      this.headerView = new HeaderView();
      this.headerView.on("search", function(query) {
        var parameters = {
          sort: "date:desc",
          size: 100,
        };
        
        if (query) { parameters.q = query; }
        
        this.torrentCollection.fetch({data: parameters});
      }.bind(this));
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

  var app = new AppView();
  app.$el.appendTo(document.body);
  app.render();
}());
