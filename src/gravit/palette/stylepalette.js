(function (_) {

    /**
     * Style Palette
     * @class GStylePalette
     * @extends GPalette
     * @constructor
     */
    function GStylePalette() {
        GPalette.call(this);
        this._styleEntries = {};
    }

    IFObject.inherit(GStylePalette, GPalette);

    GStylePalette.ID = "style";
    GStylePalette.TITLE = new IFLocale.Key(GStylePalette, "title");

    /**
     * @type {{}}
     * @private
     */
    GStylePalette.prototype._styleEntries = null;

    /**
     * @type {JQuery}
     * @private
     */
    GStylePalette.prototype._htmlElement = null;

    /**
     * @type {EXDocument}
     * @private
     */
    GStylePalette.prototype._document = null;

    /**
     * @type {JQuery}
     * @private
     */
    GStylePalette.prototype._styleVisibilityToggleControl = null;

    /**
     * @type {JQuery}
     * @private
     */
    GStylePalette.prototype._styleLinkToggleControl = null;

    /**
     * @type {JQuery}
     * @private
     */
    GStylePalette.prototype._styleDeleteControl = null;

    /**
     * @type {JQuery}
     * @private
     */
    GStylePalette.prototype._styleAddControl = null;

    /**
     * @type {JQuery}
     * @private
     */
    GStylePalette.prototype._styleSelector = null;

    /**
     * @type {JQuery}
     * @private
     */
    GStylePalette.prototype._styleSettings = null;

    /**
     * @type {JQuery}
     * @private
     */
    GStylePalette.prototype._paintsPanel = null;

    /**
     * @type {JQuery}
     * @private
     */
    GStylePalette.prototype._filtersPanel = null;

    /**
     * @type {JQuery}
     * @private
     */
    GStylePalette.prototype._effectsPanel = null;

    /**
     * @type {Array<IFElement>}
     * @private
     */
    GStylePalette.prototype._styleElements = null;

    /**
     * @type {Array<Array<IFStyle>>}
     * @private
     */
    GStylePalette.prototype._styles = null;

    /**
     * @type {Number}
     * @private
     */
    GStylePalette.prototype._selectedStyleIndex = -1;

    /** @override */
    GStylePalette.prototype.getId = function () {
        return GStylePalette.ID;
    };

    /** @override */
    GStylePalette.prototype.getTitle = function () {
        return GStylePalette.TITLE;
    };

    /** @override */
    GStylePalette.prototype.getGroup = function () {
        return "style";
    };


    /** @override */
    GStylePalette.prototype.isEnabled = function () {
        return !!gApp.getActiveDocument();
    };

    /** @override */
    GStylePalette.prototype.init = function (htmlElement, menu, controls) {
        GPalette.prototype.init.call(this, htmlElement, menu, controls);

        this._htmlElement = htmlElement;

        // Init controls
        this._styleAddControl = $('<button></button>')
            .addClass('fa fa-fw fa-plus')
            .css('margin-right', '5px')
            // TODO : I18N
            .attr('title', 'Add new style')
            .on('click', function (evt) {
                $('<div></div>')
                    .css({
                        'width': '250px'
                    })
                    .gStylePanel({
                        styleSet: this._document.getScene().getStyleCollection(),
                        nullStyle: $('<span></span>')
                            .addClass('fa fa-plus-circle')
                            .css({
                                'font-size': '24px',
                                'position': 'absolute',
                                'display': 'block',
                                'top': '50%',
                                'left': '0px',
                                'right': '0px',
                                'margin-top': '-12px',
                                'text-align': 'center'
                            })
                    })
                    .gOverlay({
                        releaseOnClose: true
                    })
                    .gOverlay('open', evt.target)
                    .on('change', function (evt, style) {
                        $(evt.target).gOverlay('close');

                        var styleIndex = -1;
                        var editor = this._document.getEditor();
                        editor.beginTransaction();
                        try {
                            for (var i = 0; i < this._styleElements.length; ++i) {
                                var appliedStyle = null;

                                if (style) {
                                    appliedStyle = new IFLinkedStyle();
                                    appliedStyle.setProperty('ref', style.getReferenceId());
                                } else {
                                    appliedStyle = new IFInlineStyle();
                                }

                                this._styleElements[i].getStyleSet().appendChild(appliedStyle);

                                if (styleIndex < 0) {
                                    styleIndex = this._getStyleIndex(appliedStyle);
                                    this._setSelectedStyle(styleIndex);
                                }
                            }
                        } finally {
                            // TODO : I18N
                            editor.commitTransaction('Add Style');
                        }
                    }.bind(this));
            }.bind(this))
            .appendTo(controls);

        this._styleVisibilityToggleControl = $('<button></button>')
            .addClass('fa fa-fw')
            .on('click', function (evt) {
                var makeVisible = this._styles[this._selectedStyleIndex][0].getProperty('vs') === false;
                this._modifyEachSelectedStyle(function (style) {
                    style.setProperty('vs', makeVisible);
                });
            }.bind(this))
            .appendTo(controls);

        this._styleLinkToggleControl = $('<button></button>')
            .addClass('fa fa-fw')
            .on('click', function () {
                //var activeStyle = this._styles[this._selectedStyleIndex][0].getProperty('vs') === false;

                // TODO : I18N
                var name = prompt('Enter a name for the new style. Not providing a name will remove the style when it is no longer in use.', '');

            }.bind(this))
            .appendTo(controls);

        this._styleDeleteControl = $('<button></button>')
            .addClass('fa fa-fw fa-trash-o')
            // TODO : I18N
            .attr('title', 'Remove hidden styles')
            .on('click', function () {
                var editor = this._document.getEditor();
                editor.beginTransaction();
                try {
                    var styles = this._styles.slice();
                    for (var i = 0; i < styles.length; ++i) {
                        var style = styles[i].slice();
                        for (var j = 0; j < style.length; ++j) {
                            if (style[j].getProperty('vs') === false) {
                                style[j].getParent().removeChild(style[j]);
                            }
                        }
                    }
                } finally {
                    // TODO : I18N
                    editor.commitTransaction('Removed Hidden Styles');
                }
            }.bind(this))
            .appendTo(controls);

        // Initialize all style entry handlers
        for (var i = 0; i < gravit.styleEntries.length; ++i) {
            var styleEntry = gravit.styleEntries[i];
            var entryClass = styleEntry.getEntryClass();
            this._styleEntries[IFObject.getTypeId(entryClass)] = styleEntry;
        }

        // Add style selector
        this._styleSelector = $('<div></div>')
            .addClass('style-selector')
            .appendTo(this._htmlElement);

        // Style settings
        this._styleSettings = $('<table></table>')
            .addClass('g-form style-settings')
            .append($('<tr></tr>')
                .append($('<td></td>')
                    .addClass('label')
                    // TODO : I18N
                    .text('Blend:'))
                .append($('<td></td>')
                    .append($('<select></select>')
                        .attr('data-property', 'blm')
                        .gBlendMode()
                        .on('change', function (evt) {
                            var val = $(evt.target).val();
                            this._modifyEachSelectedStyle(function (style) {
                                style.setProperty('blm', val);
                            });
                        }.bind(this))))
                .append($('<td></td>')
                    .addClass('label')
                    .text('Opacity:'))
                .append($('<td></td>')
                    .append($('<input>')
                        .attr('data-property', 'opc')
                        .css('width', '3em')
                        .on('change', function (evt) {
                            var opacity = IFLength.parseEquationValue($(evt.target).val());
                            if (opacity !== null) {
                                opacity = opacity < 0 ? 0 : opacity > 100 ? 100 : opacity;
                                opacity /= 100.0;
                                this._modifyEachSelectedStyle(function (style) {
                                    style.setProperty('opc', opacity);
                                });
                            } else {
                                this._updateStyleSettings();
                            }
                        }.bind(this)))))
            .appendTo(this._htmlElement);

        // Paints section
        this._paintsPanel = $('<div></div>')
            .addClass('style-entries-panel')
            .append($('<div></div>')
                .addClass('style-entries-panel-header')
                .append($('<div></div>')
                    .addClass('title')
                    .text('Fills & Borders'))
                .append($('<div></div>')
                    .addClass('controls')
                    .append($('<button></button>')
                        .addClass('fa fa-fw fa-pencil')
                        // TODO : I18N
                        .attr('title', 'Add Stroke')
                        .on('click', function () {
                            this._modifyEachSelectedStyle(function (style) {
                                style.getActualStyle().appendChild(new IFStrokePaint());
                            });
                        }.bind(this)))
                    .append($('<button></button>')
                        .addClass('fa fa-fw fa-square')
                        // TODO : I18N
                        .attr('title', 'Add Fill')
                        .on('click', function () {
                            this._modifyEachSelectedStyle(function (style) {
                                style.getActualStyle().appendChild(new IFFillPaint());
                            });
                        }.bind(this)))
                    .append($('<button></button>')
                        .addClass('fa fa-fw fa-trash-o')
                        .css('margin-left', '5px')
                        // TODO : I18N
                        .attr('title', 'Remove hidden entries')
                        .on('click', function () {
                            this._removeHiddenEntries([IFPaintEntry]);
                        }.bind(this)))))
            .append($('<table></table>')
                .addClass('style-entries-panel-table'))
            .appendTo(this._htmlElement);

        // Filter section
        this._filtersPanel = $('<div></div>')
            .addClass('style-entries-panel')
            .append($('<div></div>')
                .addClass('style-entries-panel-header')
                .append($('<div></div>')
                    .addClass('title')
                    .text('Filters'))
                .append($('<div></div>')
                    .addClass('controls')
                    .append($('<button></button>')
                        .addClass('fa fa-fw fa-circle')
                        // TODO : I18N
                        .attr('title', 'Add Blur')
                        .on('click', function () {
                            this._modifyEachSelectedStyle(function (style) {
                                style.getActualStyle().appendChild(new IFBlurFilter());
                            });
                        }.bind(this)))
                    .append($('<button></button>')
                        .addClass('fa fa-fw fa-trash-o')
                        .css('margin-left', '5px')
                        // TODO : I18N
                        .attr('title', 'Remove hidden entries')
                        .on('click', function () {
                            this._removeHiddenEntries([IFFilterEntry]);
                        }.bind(this)))))
            .append($('<table></table>')
                .addClass('style-entries-panel-table'))
            .appendTo(this._htmlElement);

        // Effects section
        this._effectsPanel = $('<div></div>')
            .addClass('style-entries-panel')
            .append($('<div></div>')
                .addClass('style-entries-panel-header')
                .append($('<div></div>')
                    .addClass('title')
                    .text('Effects'))
                .append($('<div></div>')
                    .addClass('controls')
                    .append($('<button></button>')
                        .addClass('fa fa-fw fa-cube')
                        // TODO : I18N
                        .attr('title', 'Add Shadow')
                        .on('click', function () {
                            this._modifyEachSelectedStyle(function (style) {
                                style.getActualStyle().appendChild(new IFShadowEffect());
                            });
                        }.bind(this)))
                    .append($('<button></button>')
                        .addClass('fa fa-fw fa-dot-circle-o')
                        // TODO : I18N
                        .attr('title', 'Add Vector Offset')
                        .on('click', function () {
                            this._modifyEachSelectedStyle(function (style) {
                                style.getActualStyle().appendChild(new IFOffsetVEffect());
                            });
                        }.bind(this)))
                    .append($('<button></button>')
                        .addClass('fa fa-fw fa-trash-o')
                        .css('margin-left', '5px')
                        // TODO : I18N
                        .attr('title', 'Remove hidden entries')
                        .on('click', function () {
                            this._removeHiddenEntries([IFEffectEntry, IFVectorAttribute]);
                        }.bind(this)))))
            .append($('<table></table>')
                .addClass('style-entries-panel-table'))
            .appendTo(this._htmlElement);
    };

    /** @override */
    GStylePalette.prototype._documentEvent = function (event) {
        if (event.type === GApplication.DocumentEvent.Type.Activated) {
            this._document = event.document;
            var scene = this._document.getScene();
            var editor = this._document.getEditor();

            // Subscribe to scene events
            scene.addEventListener(IFNode.AfterInsertEvent, this._afterInsert, this);
            scene.addEventListener(IFNode.BeforeRemoveEvent, this._beforeRemove, this);
            scene.addEventListener(IFNode.AfterPropertiesChangeEvent, this._afterPropertiesChange, this);

            // Subscribe to the editor's events
            editor.addEventListener(IFEditor.SelectionChangedEvent, this._updateFromSelection, this);

            this._updateFromSelection();

            this.trigger(GPalette.UPDATE_EVENT);
        } else if (event.type === GApplication.DocumentEvent.Type.Deactivated) {
            var scene = this._document.getScene();
            var editor = this._document.getEditor();

            // Unsubscribe from the editor's events
            editor.removeEventListener(IFEditor.SelectionChangedEvent, this._updateFromSelection);

            // Unsubscribe from scene events
            scene.removeEventListener(IFNode.AfterInsertEvent, this._afterInsert);
            scene.removeEventListener(IFNode.BeforeRemoveEvent, this._beforeRemove);
            scene.removeEventListener(IFNode.AfterPropertiesChangeEvent, this._afterPropertiesChange);

            this._document = null;
            this._styleElements = null;
            this._styles = null;
            this._selectedStyleIndex = -1;
            this._updateSelectedStyle();

            this.trigger(GPalette.UPDATE_EVENT);
        }
    };

    /**
     * @param {IFNode.AfterInsertEvent} evt
     * @private
     */
    GStylePalette.prototype._afterInsert = function (evt) {
        if (evt.node instanceof IFStyleEntry) {
            var style = evt.node.getOwnerStyle();
            if (style && this._isSelectedStyle(style)) {
                this._insertEntryRow(evt.node);
            }
        } else if (evt.node instanceof IFStyle) {
            this._insertStyles(evt.node);
        }
    };

    /**
     * @param {IFNode.BeforeRemoveEvent} evt
     * @private
     */
    GStylePalette.prototype._beforeRemove = function (evt) {
        if (evt.node instanceof IFStyleEntry) {
            var style = evt.node.getOwnerStyle();
            if (style && this._isSelectedStyle(style)) {
                this._removeEntryRow(evt.node);
            }
        } else if (evt.node instanceof IFStyle) {
            this._removeStyle(evt.node);
        }
    };

    /**
     * @param {IFNode.AfterPropertiesChangeEvent} evt
     * @private
     */
    GStylePalette.prototype._afterPropertiesChange = function (evt) {
        if (evt.node instanceof IFStyleEntry) {
            var style = evt.node.getOwnerStyle();
            if (style && this._isSelectedStyle(style)) {
                this._updateEntryRow(evt.node);
            }
        } else if (evt.node instanceof IFStyle && this._isSelectedStyle(evt.node)) {
            this._updateStyleSettings();
        }
    };

    /**
     * @private
     */
    GStylePalette.prototype._updateFromSelection = function () {
        this._styleElements = null;
        this._styles = null;
        this._selectedStyleIndex = -1;
        var selection = this._document.getEditor().getSelection();

        // Figure our available style elements
        if (selection && selection.length > 0) {
            for (var i = 0; i < selection.length; ++i) {
                var element = selection[i];
                if (element.hasMixin(IFElement.Style)) {
                    if (!this._styleElements) {
                        this._styleElements = [];
                    }

                    this._styleElements.push(element);
                }
            }
        }

        // Clear style selector
        this._styleSelector.empty();

        if (this._styleElements) {
            this._insertStyles();
        }

        // Reset style selection if there're no styles
        if (!this._styles) {
            this._setSelectedStyle(-1);
        }
    };

    GStylePalette.prototype._setSelectedStyle = function (selectedIndex) {
        this._selectedStyleIndex = selectedIndex;
        this._styleSelector.find('.style-block').each(function (index, block) {
            $(block)
                .toggleClass('selected', index === selectedIndex);
        });
        this._updateSelectedStyle();
    };

    GStylePalette.prototype._modifyEachSelectedStyle = function (modifier, styleIndex) {
        if (typeof styleIndex === 'number' || this._selectedStyleIndex >= 0) {
            var editor = this._document.getEditor();
            editor.beginTransaction();
            try {
                this._visitEachSelectedStyle(modifier, styleIndex);
            } finally {
                // TODO : I18N
                editor.commitTransaction('Modify Style(s)');
            }
        }
    };

    GStylePalette.prototype._visitEachSelectedStyle = function (visitor, styleIndex) {
        if (typeof styleIndex === 'number' || this._selectedStyleIndex >= 0) {
            var style = this._styles[this._selectedStyleIndex >= 0 ? this._selectedStyleIndex : styleIndex].slice();
            for (var i = 0; i < style.length; ++i) {
                visitor(style[i]);
            }
        }
    };

    GStylePalette.prototype._isSelectedStyle = function (style) {
        return this._selectedStyleIndex >= 0 && this._getStyleIndex(style) === this._selectedStyleIndex;
    };

    GStylePalette.prototype._insertStyles = function (style) {
        var _addStyleBlock = function (style, index) {
            var block = $('<div></div>')
                .addClass('style-block')
                .append($('<img>')
                    .addClass('style-preview')
                    .attr('src', style.createPreviewImage(36, 36)))
                .on('click', function () {
                    this._setSelectedStyle(this._getStyleIndex(style));
                }.bind(this))
                .data('style', style);

            if (index >= 0) {
                block.insertBefore(this._styleSelector.children('.style-block').eq(index));
            } else {
                block.appendTo(this._styleSelector);
            }
        }.bind(this);

        var _addStyles = function (styles) {
            var canAddStyles = false;

            if (style) {
                for (var i = 0; i < styles.length; ++i) {
                    if (styles[i] === style) {
                        canAddStyles = true;
                        break;
                    }
                }
            } else {
                canAddStyles = true;
            }

            if (canAddStyles && this._styles && this._styles.length > 0) {
                // Make sure the styles doesn't yet exist in our containers
                for (var i = 0; i < this._styles.length; ++i) {
                    if (this._styles[i][0] === styles[0]) {
                        canAddStyles = false;
                        break;
                    }
                }
            }

            if (canAddStyles) {
                // Figure the right insertion point for the style
                var style = styles[0];
                var nextStyleIndex = -1;
                for (var next = style.getNext(); next !== null; next = next.getNext()) {
                    if (next instanceof IFStyle) {
                        nextStyleIndex = this._getStyleIndex(next);
                        break;
                    }
                }

                if (!this._styles) {
                    this._styles = [];
                }

                if (nextStyleIndex >= 0) {
                    this._styles.splice(nextStyleIndex, 0, styles);
                } else {
                    this._styles.push(styles);
                }

                _addStyleBlock(styles[0], nextStyleIndex);
            }
        }.bind(this);

        if (!this._styleElements || this._styleElements.length === 0) {
            // NO-OP w/o stylable elements
            return;
        }

        if (this._styleElements.length === 1) {
            // Easy-peacy, add all styles from element
            var styleSet = this._styleElements[0].getStyleSet();
            for (var node = styleSet.getFirstChild(); node !== null; node = node.getNext()) {
                if (node instanceof IFStyle) {
                    _addStyles([node]);
                }
            }
        } else {
            // Iterate and add the first, non-linked style as default one
            // as well as add all linked styles that are common to _all_ elements
            var linkedStyles = [];
            var defaultStyles = [];

            for (var i = 0; i < this._styleElements.length; ++i) {
                var styleSet = this._styleElements[i].getStyleSet();
                var hasDefaultStyle = false;
                for (var node = styleSet.getFirstChild(); node !== null; node = node.getNext()) {
                    if (node instanceof IFLinkedStyle) {
                        var hasLinkedStyle = false;
                        for (var j = 0; j < linkedStyles.length; ++j) {
                            if (linkedStyles[j][0].getProperty('ref') === node.getProperty('ref')) {
                                linkedStyles[j].push(node);
                                hasLinkedStyle = true;
                                break;
                            }
                        }

                        if (!hasLinkedStyle) {
                            linkedStyles.push([node]);
                        }
                    }
                    else if (node instanceof IFInlineStyle) {
                        if (!hasDefaultStyle) {
                            defaultStyles.push(node);
                        }
                        hasDefaultStyle = true;
                    }
                }
            }

            // Add default style if common to all elements
            if (defaultStyles.length === this._styleElements.length) {
                _addStyles(defaultStyles);
            }

            // Add all linked styles if they're common to all elements
            for (var i = 0; i < linkedStyles.length; ++i) {
                if (linkedStyles[i].length === this._styleElements.length) {
                    _addStyles(linkedStyles[i]);
                }
            }
        }

        // Make default selection if there's none yet
        if (this._selectedStyleIndex < 0 && this._styles && this._styles.length > 0) {
            this._setSelectedStyle(0);
        }
    };

    GStylePalette.prototype._removeStyle = function (style) {
        if (this._styles) {
            var styleIndex = this._getStyleIndex(style);

            if (styleIndex >= 0) {
                // Remove from style selector
                this._styleSelector.find('.style-block').each(function (index, element) {
                    if (index === styleIndex) {
                        $(element).remove();
                        return false;
                    }
                });

                // Remove from styles array
                var styles = this._styles[styleIndex];
                for (var i = 0; i < styles.length; ++i) {
                    if (styles[i] === style) {
                        styles.splice(i, 1);
                        break;
                    }
                }

                if (styles.length === 0) {
                    this._styles.splice(styleIndex, 1);

                    // Update selected style if active
                    if (styleIndex === this._selectedStyleIndex) {
                        this._setSelectedStyle(this._styles.length > 0 ? 0 : -1);
                    } else if (styleIndex < this._selectedStyleIndex) {
                        this._selectedStyleIndex -= 1;
                    }

                    // Update style selector when there's no styles
                    if (this._styles.length === 0) {
                        this._styles = null;
                        this._styleSelector.css('display', 'none');
                    }
                }
            }
        }
    };

    GStylePalette.prototype._getStyleIndex = function (style) {
        if (!this._styles || this._styles.length === 0) {
            return -1;
        }

        for (var i = 0; i < this._styles.length; ++i) {
            for (var j = 0; j < this._styles[i].length; ++j) {
                if (style instanceof IFSharedStyle) {
                    if (this._styles[i][j] instanceof IFLinkedStyle && this._styles[i][j].getProperty('ref') === style.getReferenceId()) {
                        return i;
                    }
                } else {
                    if (this._styles[i][j] === style) {
                        return i;
                    }
                }
            }
        }

        return -1;
    };

    GStylePalette.prototype._removeHiddenEntries = function (entryClasses) {
        this._modifyEachSelectedStyle(function (style) {
            var style = style.getActualStyle();
            var removal = [];

            for (var entry = style.getFirstChild(); entry !== null; entry = entry.getNext()) {
                if (entry instanceof IFStyleEntry && entry.getProperty('vs') === false) {
                    for (var j = 0; j < entryClasses.length; ++j) {
                        if (entryClasses[j].prototype.isPrototypeOf(entry)) {
                            removal.push(entry);
                            break;
                        }
                    }
                }
            }

            for (var i = 0; i < removal.length; ++i) {
                style.removeChild(removal[i]);
            }
        });
    };

    GStylePalette.prototype._updateSelectedStyle = function () {
        this._styleSelector.css('display', this._styles ? '' : 'none');
        this._updateStyleSettings();
        this._updateEntries();
    };

    GStylePalette.prototype._updateStyleSettings = function () {
        this._styleSettings.css('display', 'none');
        this._styleVisibilityToggleControl.css('display', 'none');
        this._styleLinkToggleControl.css('display', 'none');
        this._styleDeleteControl.prop('disabled', true);
        this._styleAddControl.prop('disabled', this._styleElements === null || this._styleElements.length === 0);

        if (this._selectedStyleIndex >= 0) {
            this._styleSettings.css('display', '');
            var style = this._styles[this._selectedStyleIndex][0];

            this._styleVisibilityToggleControl
                .toggleClass('fa-eye', style.getProperty('vs') == false)
                .toggleClass('fa-eye-slash', style.getProperty('vs') == true)
                // TODO : I18N
                .attr('title', style.getProperty('vs') ? 'Hide style' : 'Show style')
                .css('display', '');

            this._styleLinkToggleControl
                .toggleClass('fa-link', !(style instanceof IFLinkedStyle))
                .toggleClass('fa-unlink', style instanceof IFLinkedStyle)
                // TODO : I18N
                .attr('title', style instanceof IFLinkedStyle ? 'Unlink style' : 'Link style')
                .css('display', '');

            this._styleDeleteControl.prop('disabled', false);

            this._styleSettings.find('[data-property="blm"]').val(style.getProperty('blm'));
            this._styleSettings.find('[data-property="opc"]').val(ifUtil.formatNumber(style.getProperty('opc') * 100));
        }
    };

    GStylePalette.prototype._updateEntries = function () {
        this._paintsPanel.css('display', 'none');
        this._paintsPanel.find('.style-entries-panel-table').empty();
        this._filtersPanel.css('display', 'none');
        this._filtersPanel.find('.style-entries-panel-table').empty();
        this._effectsPanel.css('display', 'none');
        this._effectsPanel.find('.style-entries-panel-table').empty();

        if (this._selectedStyleIndex >= 0) {
            this._paintsPanel.css('display', '');
            this._filtersPanel.css('display', '');
            this._effectsPanel.css('display', '');
            var style = this._styles[this._selectedStyleIndex][0].getActualStyle();

            for (var entry = style.getFirstChild(); entry !== null; entry = entry.getNext()) {
                if (entry instanceof IFStyleEntry) {
                    this._insertEntryRow(entry);
                }
            }
        }
    };

    var dragRow = null;
    var hasDropped = false;

    GStylePalette.prototype._insertEntryRow = function (entry) {
        var handler = this._styleEntries[IFObject.getTypeId(entry)];

        if (handler) {
            var panel = this._getPanelFromEntry(entry);
            var table = panel.find('.style-entries-panel-table');

            var contents = handler.createContent(entry);

            var _canDrop = function (source, target) {
                return source !== target && source.parentNode === target.parentNode;
            };

            var row = $('<tr></tr>')
                .data('entry', entry)
                .attr('draggable', 'true')
                .on('dragstart', function (evt) {
                    var event = evt.originalEvent;
                    event.dataTransfer.effectAllowed = 'move';
                    this.className = 'drag';
                    dragRow = this;
                    hasDropped = false;
                })
                .on('dragend', function (evt) {
                    if (!hasDropped) {
                        // Delete our entry
                        // TODO : Undo + Redo + Apply to all
                        entry.getParent().removeChild(entry);
                    }

                    this.className = '';
                    dragRow = null;
                    hasDropped = false;
                })
                .on('dragenter', function (evt) {
                    var event = evt.originalEvent;
                    event.preventDefault();
                    event.stopPropagation();
                    if (_canDrop(dragRow, this)) {
                        this.className = 'drop';
                    }
                })
                .on('dragleave', function (evt) {
                    var event = evt.originalEvent;
                    event.preventDefault();
                    event.stopPropagation();
                    if (_canDrop(dragRow, this)) {
                        this.className = '';
                    }
                })
                .on('dragover', function (evt) {
                    var event = evt.originalEvent;
                    if (_canDrop(dragRow, this)) {
                        event.preventDefault();
                        event.stopPropagation();
                    }
                })
                .on('drop', function (evt) {
                    var event = evt.originalEvent;
                    event.preventDefault();
                    event.stopPropagation();
                    this.className = '';
                    hasDropped = true;

                    // TODO : Move our entry
                })
                .append($('<td></td>')
                    .addClass('visibility')
                    .append($('<span></span>')
                        // TODO : I18N
                        .attr('title', 'Toggle visibility')
                        .on('click', function () {
                            // TODO : Undo + Redo + Apply to all
                            entry.setProperty('vs', !entry.getProperty('vs'));
                        })))
                .append($('<td></td>')
                    .addClass('contents')
                    .append(contents))
                .appendTo(table);

            this._updateEntryRow(entry, row);
        }
    };

    GStylePalette.prototype._removeEntryRow = function (entry, row) {
        if (!row) {
            var panel = this._getPanelFromEntry(entry);
            var table = panel.find('.style-entries-panel-table');

            table.find('tr').each(function (index, element) {
                var $element = $(element);
                if ($element.data('entry') === entry) {
                    row = $element;
                    return false;
                }
            });
        }

        if (row) {
            row.remove();
        }
    };

    GStylePalette.prototype._updateEntryRow = function (entry, row) {
        var handler = this._styleEntries[IFObject.getTypeId(entry)];

        if (handler) {
            if (!row) {
                var panel = this._getPanelFromEntry(entry);
                var table = panel.find('.style-entries-panel-table');

                table.find('tr').each(function (index, element) {
                    var $element = $(element);
                    if ($element.data('entry') === entry) {
                        row = $element;
                        return false;
                    }
                });
            }

            if (row) {
                row.find('.visibility span').attr('class', 'fa fa-eye' + (!entry.getProperty('vs') ? '-slash' : ''));
            }
        }
    };

    GStylePalette.prototype._getPanelFromEntry = function (entry) {
        if (entry instanceof IFPaintEntry) {
            return this._paintsPanel;
        } else if (entry instanceof IFFilterEntry) {
            return this._filtersPanel;
        } else if (entry instanceof IFEffectAttribute || entry instanceof IFVectorAttribute) {
            return this._effectsPanel;
        }
    };

    /** @override */
    GStylePalette.prototype.toString = function () {
        return "[Object GStylePalette]";
    };

    _.GStylePalette = GStylePalette;
})(this);