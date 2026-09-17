import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AudioLines,
  ChevronLeft,
  ExternalLink,
  Maximize,
  Maximize2,
  Minimize,
  Minimize2,
  MessageSquare,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import {
  MAX_MULTISTREAM_TILES,
  type MultiStreamTileState,
  type NativeQuality,
  type NativeQualityValue,
} from "../../shared/player";
import type { FollowedChannel } from "../../shared/twitch";
import { channelKey, isValidChannelName, parseChannelKey, type Platform } from "../../shared/platform";
import { ProviderLogo } from "./ProviderLogo";
import { HlsNativeVideo } from "./HlsNativeVideo";
import { useStreamWindows } from "./use-stream-windows";
import "./multi-stream.css";

interface MultiStreamViewProps {
  tiles: MultiStreamTileState[];
  followedLive: FollowedChannel[];
  initialSearch: string;
  twitchDirectoryAvailable: boolean;
  nameFor: (login: string) => string;
  tooltipFor: (channel: string) => string;
  controlsHideDelay: number;
  onAdd: (channel: string) => void;
  onSearchChannels: (query: string, platform: Platform) => Promise<ChannelSuggestion[]>;
  onRemove: (id: number) => void;
  onActivate: (id: number) => void;
  onToggleMute: (id: number) => void;
  onSetVolume: (id: number, volume: number) => void;
  onToggleCompressor: (id: number, enabled: boolean) => void;
  onSetQuality: (id: number, quality: NativeQualityValue) => void;
  chatVisible: boolean;
  onToggleChat: () => void;
  theater: boolean;
  onToggleTheater: () => void;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
  onExit: () => void;
}

export function MultiStreamView({
  tiles,
  followedLive,
  initialSearch,
  twitchDirectoryAvailable,
  nameFor,
  tooltipFor,
  controlsHideDelay,
  onAdd,
  onSearchChannels,
  onRemove,
  onActivate,
  onToggleMute,
  onSetVolume,
  onToggleCompressor,
  onSetQuality,
  chatVisible,
  onToggleChat,
  theater,
  onToggleTheater,
  fullscreen,
  onToggleFullscreen,
  onExit,
}: MultiStreamViewProps) {
  const [pickerOpen, setPickerOpen] = useState(tiles.length === 0);
  const canAdd = tiles.length < MAX_MULTISTREAM_TILES;
  const usedLogins = useMemo(() => new Set(tiles.map((tile) => tile.channel)), [tiles]);
  const {
    targets: streamWindowTargets,
    open: openStreamWindow,
    close: closeStreamWindow,
  } = useStreamWindows();
  const dockedCount = tiles.filter((tile) => !streamWindowTargets.has(tile.id)).length;

  useEffect(() => {
    const liveIds = new Set(tiles.map((tile) => tile.id));
    for (const id of streamWindowTargets.keys()) {
      if (!liveIds.has(id)) closeStreamWindow(id);
    }
  }, [closeStreamWindow, streamWindowTargets, tiles]);

  // Close the add-stream menu when clicking anywhere outside it or its toggle.
  useEffect(() => {
    if (!pickerOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Element &&
        (target.closest(".multi-add-picker") || target.closest(".multi-add-toggle"))
      ) {
        return;
      }
      setPickerOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [pickerOpen]);

  return (
    <section className="multi-stream-page">
      <header className="multi-stream-bar">
        <div className="multi-stream-title">
          <button
            aria-label="Exit multistream"
            className="multi-back"
            onClick={onExit}
            title="Exit multistream"
            type="button"
          >
            <ChevronLeft size={24} />
          </button>
          <strong>Multistream</strong>
          <span>
            {tiles.length}/{MAX_MULTISTREAM_TILES} streams
          </span>
        </div>
        <div className="multi-stream-bar-actions">
          {canAdd && (
            <button
              className={pickerOpen ? "multi-bar-btn multi-add-toggle active" : "multi-bar-btn multi-add-toggle"}
              onClick={() => setPickerOpen((open) => !open)}
              type="button"
            >
              <Plus size={16} /> Add stream
            </button>
          )}
          <button
            aria-pressed={!chatVisible}
            className={!chatVisible ? "multi-bar-btn active" : "multi-bar-btn"}
            onClick={onToggleChat}
            title={chatVisible ? "Hide chat" : "Show chat"}
            type="button"
          >
            <MessageSquare size={16} /> {chatVisible ? "Hide chat" : "Show chat"}
          </button>
          <button
            aria-pressed={theater}
            className={theater ? "multi-bar-btn active" : "multi-bar-btn"}
            onClick={onToggleTheater}
            title="Theater mode (T)"
            type="button"
          >
            {theater ? <Minimize2 size={16} /> : <Maximize2 size={16} />} Theater
          </button>
          <button
            aria-pressed={fullscreen}
            className={fullscreen ? "multi-bar-btn active" : "multi-bar-btn"}
            onClick={onToggleFullscreen}
            title={fullscreen ? "Exit fullscreen (F)" : "Fullscreen (F)"}
            type="button"
          >
            {fullscreen ? <Minimize size={16} /> : <Maximize size={16} />} Fullscreen
          </button>
          {pickerOpen && canAdd && (
            <AddStreamPicker
              followedLive={followedLive}
              initialSearch={initialSearch}
              initialPlatform={
                parseChannelKey(tiles.find((tile) => tile.active)?.channel ?? tiles[0]?.channel ?? "").platform
              }
              twitchDirectoryAvailable={twitchDirectoryAvailable}
              usedLogins={usedLogins}
              onSearchChannels={onSearchChannels}
              onAdd={(login) => {
                onAdd(login);
                setPickerOpen(false);
              }}
              onClose={() => setPickerOpen(false)}
            />
          )}
        </div>
      </header>

      <div className={`multi-grid count-${dockedCount}`}>
        {tiles.map((tile) => {
          const popoutTarget = streamWindowTargets.get(tile.id);
          const player = (
            <MultiTile
              key={tile.id}
              tile={tile}
              name={nameFor(tile.channel)}
              tooltip={tooltipFor(tile.channel)}
              platform={parseChannelKey(tile.channel).platform}
              controlsHideDelay={controlsHideDelay}
              onRemove={onRemove}
              onActivate={onActivate}
              onToggleMute={onToggleMute}
              onSetVolume={onSetVolume}
              onToggleCompressor={onToggleCompressor}
              onSetQuality={onSetQuality}
              poppedOut={Boolean(popoutTarget)}
              onTogglePopout={(id, name) => {
                if (popoutTarget) closeStreamWindow(id);
                else openStreamWindow(id, name);
              }}
            />
          );
          return popoutTarget
            ? createPortal(
                <div className="stream-popout-shell">{player}</div>,
                popoutTarget.document.body,
                `stream-popout-${tile.id}`,
              )
            : player;
        })}
        {tiles.length === 0 && (
          <div className="multi-empty">
            <p>Add up to {MAX_MULTISTREAM_TILES} streams to watch them together.</p>
            <button className="multi-add-toggle" onClick={() => setPickerOpen(true)} type="button">
              <Plus size={16} /> Add a stream
            </button>
          </div>
        )}
        {tiles.length > 0 && dockedCount === 0 && (
          <div className="multi-empty">
            <p>Every stream is open in its own window.</p>
            <span>Close a pop-out window to dock that stream here again.</span>
          </div>
        )}
      </div>
    </section>
  );
}

interface MultiTileProps {
  tile: MultiStreamTileState;
  name: string;
  tooltip: string;
  platform: Platform;
  controlsHideDelay: number;
  onRemove: (id: number) => void;
  onActivate: (id: number) => void;
  onToggleMute: (id: number) => void;
  onSetVolume: (id: number, volume: number) => void;
  onToggleCompressor: (id: number, enabled: boolean) => void;
  onSetQuality: (id: number, quality: NativeQualityValue) => void;
  poppedOut: boolean;
  onTogglePopout: (id: number, name: string) => void;
}

const MultiTile = memo(function MultiTile({
  tile,
  name,
  tooltip,
  platform,
  controlsHideDelay,
  onRemove,
  onActivate,
  onToggleMute,
  onSetVolume,
  onToggleCompressor,
  onSetQuality,
  poppedOut,
  onTogglePopout,
}: MultiTileProps) {
  const [qualityMenuOpen, setQualityMenuOpen] = useState(false);
  const [qualities, setQualities] = useState<NativeQuality[]>([]);
  // Controls auto-hide exactly like the single player: they start visible, hide
  // after the configured delay of no movement, reveal on pointer move, and hide
  // immediately when the pointer leaves the tile. The cursor hides with them.
  const [controlsShown, setControlsShown] = useState(true);
  const hideTimer = useRef<number | null>(null);

  const revealControls = useCallback(() => {
    setControlsShown(true);
    if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setControlsShown(false), controlsHideDelay);
  }, [controlsHideDelay]);

  const hideControls = useCallback(() => {
    if (hideTimer.current !== null) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    setControlsShown(false);
  }, []);

  // Start the initial hide countdown on mount, like the single player.
  useEffect(() => {
    hideTimer.current = window.setTimeout(() => setControlsShown(false), controlsHideDelay);
    return () => {
      if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    };
  }, [controlsHideDelay]);

  // The quality popover keeps the bar up while it's open.
  const barVisible = controlsShown || qualityMenuOpen;

  // Lazy-load the quality list the first time the menu opens for this tile.
  useEffect(() => {
    if (!qualityMenuOpen || qualities.length > 0) return;
    let cancelled = false;
    void window.desktop.player
      .getNativeQualities(tile.channel)
      .then((list) => {
        if (!cancelled) setQualities(list);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [qualityMenuOpen, qualities.length, tile.channel]);

  const { status, error } = tile.state;
  const offline = error === "Stream is offline." || /offline|no playable streams/i.test(error ?? "");
  const showOverlay = status !== "playing";

  return (
    <div
      className={[
        "multi-tile",
        tile.active ? "active" : "",
        barVisible ? "" : "controls-hidden",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={() => onActivate(tile.id)}
      onAuxClick={(event) => {
        if (event.button !== 1) return;
        if (event.target instanceof Element && event.target.closest("button, input")) return;
        event.preventDefault();
        onToggleMute(tile.id);
        revealControls();
      }}
      onMouseDown={(event) => {
        if (
          event.button === 1 &&
          !(event.target instanceof Element && event.target.closest("button, input"))
        ) {
          event.preventDefault();
        }
      }}
      onMouseMove={revealControls}
      onMouseLeave={hideControls}
    >
      <HlsNativeVideo
        key={tile.state.hlsSource?.sessionId ?? `pending-${tile.id}`}
        state={tile.state}
        target={`multi-${tile.id}`}
      />
      {showOverlay && (
        <div className="multi-tile-overlay">
          <span className={`native-status-orb ${offline ? "offline" : status}`} />
          <strong>
            {offline
              ? `${name} is offline`
              : status === "error"
                ? "Could not start"
                : `Loading ${name}`}
          </strong>
          {status === "error" && !offline && error && <p>{error}</p>}
        </div>
      )}
      <div className="multi-tile-name-box">
        {tile.active && <span className={`multi-tile-live-dot ${platform}`} title="Audio playing" />}
        <ProviderLogo name={platform} />
        <span className="multi-tile-name" title={tooltip}>{name}</span>
      </div>
      <div className="multi-tile-controls" onClick={(event) => event.stopPropagation()}>
        <button
          aria-label={tile.state.muted ? "Unmute" : "Mute"}
          className="multi-tile-btn"
          onClick={() => onToggleMute(tile.id)}
          title={tile.state.muted ? "Unmute" : "Mute"}
          type="button"
        >
          {tile.state.muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>
        <input
          aria-label="Volume"
          className="multi-tile-volume"
          max="100"
          min="0"
          onChange={(event) => onSetVolume(tile.id, Number(event.target.value))}
          type="range"
          value={tile.state.volume}
        />
        <button
          aria-label={
            tile.state.compressorEnabled ? "Disable audio compressor" : "Enable audio compressor"
          }
          aria-pressed={tile.state.compressorEnabled}
          className="multi-tile-btn"
          onClick={() => onToggleCompressor(tile.id, !tile.state.compressorEnabled)}
          title="Audio compressor"
          type="button"
        >
          <span className={`icon-toggle${tile.state.compressorEnabled ? "" : " off"}`}>
            <AudioLines size={14} />
          </span>
        </button>
        <div className="multi-tile-quality">
          <button
            aria-label="Quality"
            className={qualityMenuOpen ? "multi-tile-btn active" : "multi-tile-btn"}
            onClick={() => setQualityMenuOpen((open) => !open)}
            title="Change quality"
            type="button"
          >
            <Settings size={14} />
          </button>
          {qualityMenuOpen && (
            <div className="multi-tile-quality-menu">
              {qualities.length === 0 ? (
                <span className="multi-tile-quality-loading">Loading…</span>
              ) : (
                qualities.map((quality) => (
                  <button
                    className={
                      tile.state.quality === quality.value
                        ? "multi-tile-quality-option active"
                        : "multi-tile-quality-option"
                    }
                    key={quality.value}
                    onClick={() => {
                      onSetQuality(tile.id, quality.value);
                      setQualityMenuOpen(false);
                    }}
                    type="button"
                  >
                    {quality.label}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        <button
          aria-label={poppedOut ? `Dock ${name}` : `Pop out ${name}`}
          className="multi-tile-btn"
          onClick={() => onTogglePopout(tile.id, name)}
          title={poppedOut ? "Dock stream" : "Open in resizable window"}
          type="button"
        >
          {poppedOut ? <Minimize2 size={14} /> : <ExternalLink size={14} />}
        </button>
        <button
          aria-label={`Remove ${name}`}
          className="multi-tile-btn multi-tile-remove"
          onClick={() => onRemove(tile.id)}
          title="Remove stream"
          type="button"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
});

interface AddStreamPickerProps {
  followedLive: FollowedChannel[];
  initialSearch: string;
  initialPlatform: Platform;
  twitchDirectoryAvailable: boolean;
  usedLogins: Set<string>;
  onAdd: (login: string) => void;
  onSearchChannels: (query: string, platform: Platform) => Promise<ChannelSuggestion[]>;
  onClose: () => void;
}

interface ChannelSuggestion {
  login: string;
  displayName: string;
  profileImageUrl?: string;
  category?: string;
  isLive?: boolean;
}

function AddStreamPicker({ followedLive, initialSearch, initialPlatform, twitchDirectoryAvailable, usedLogins, onAdd, onSearchChannels, onClose }: AddStreamPickerProps) {
  const [query, setQuery] = useState(initialSearch);
  // The service to add the typed name on. The logo before the field toggles it;
  // Twitch by default. Typing an explicit "twitch:"/"kick:" flips it too.
  const [scope, setScope] = useState<Platform>(initialPlatform);
  const [suggestions, setSuggestions] = useState<ChannelSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  // Tile playback state updates frequently. Keep the newest callback in a ref
  // so those parent renders cannot cancel and restart an in-flight search.
  const searchChannelsRef = useRef(onSearchChannels);
  useEffect(() => {
    searchChannelsRef.current = onSearchChannels;
  }, [onSearchChannels]);
  const available = useMemo(
    () => scope === "twitch"
      ? followedLive.filter((channel) => !usedLogins.has(channel.login))
      : [],
    [followedLive, scope, usedLogins],
  );

  useEffect(() => {
    const name = query.trim();
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (name.length < 2) {
        setSuggestions([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      void searchChannelsRef.current(name, scope)
        .then((results) => {
          if (!cancelled) setSuggestions(results);
        })
        .catch(() => {
          if (!cancelled) setSuggestions([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, name.length < 2 ? 0 : 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, scope]);

  const typedName = query.trim().toLowerCase();
  const typedKey = channelKey(scope, typedName);
  const canAddTypedName =
    typedName.length >= 2 &&
    isValidChannelName(scope, typedName) &&
    !usedLogins.has(typedKey);
  const choices = typedName.length >= 2
    ? suggestions.filter((channel) => !usedLogins.has(channelKey(scope, channel.login)))
    : available;

  const submit = () => {
    const name = query.trim().toLowerCase();
    if (name) onAdd(channelKey(scope, name));
  };

  return (
    <div className="multi-add-picker" role="dialog" aria-label="Add a stream">
      <div className="multi-add-platforms" role="group" aria-label="Search service">
        {(["twitch", "kick"] as const).map((platform) => (
          <button
            aria-pressed={scope === platform}
            className={scope === platform ? `active ${platform}` : platform}
            key={platform}
            onClick={() => setScope(platform)}
            type="button"
          >
            <ProviderLogo name={platform} /> {platform === "kick" ? "Kick" : "Twitch"}
          </button>
        ))}
      </div>
      <div className="multi-add-field">
        <Search size={16} />
        <input
          aria-label="Add channel by name"
          autoFocus
          onChange={(event) => {
            const prefix = /^(twitch|kick):(.*)$/i.exec(event.target.value);
            if (prefix) {
              setScope(prefix[1].toLowerCase() as Platform);
              setQuery(prefix[2]);
            } else {
              setQuery(event.target.value);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") onClose();
            if (event.key === "Enter") submit();
          }}
          placeholder={`Add a ${scope === "kick" ? "Kick" : "Twitch"} channel…`}
          type="text"
          value={query}
        />
      </div>
      <div className="multi-add-list">
        {scope === "twitch" && !twitchDirectoryAvailable && typedName.length < 2 && (
          <p className="multi-add-empty">
            Type an exact Twitch channel name. It will appear here immediately and can be added without signing in.
          </p>
        )}
        {scope === "kick" && typedName.length < 2 && (
          <p className="multi-add-empty">Type at least two letters to search public Kick channels.</p>
        )}
        {canAddTypedName && (
          <button className="multi-add-direct" onClick={() => onAdd(typedKey)} type="button">
            <ProviderLogo name={scope} />
            <span className="multi-add-name">Add <strong>{typedName}</strong></span>
            <span className="multi-add-game">{scope === "kick" ? "Kick channel" : "Twitch channel"}</span>
          </button>
        )}
        {choices.map((channel) => (
          <button key={channel.login} onClick={() => onAdd(channelKey(scope, channel.login))} type="button">
            {channel.profileImageUrl && <img alt="" src={channel.profileImageUrl} />}
            <span className="multi-add-name">{channel.displayName}</span>
            <span className="multi-add-game">{channel.category || "Live"}</span>
          </button>
        ))}
        {searching && <p className="multi-add-empty">Searching {scope === "kick" ? "Kick" : "Twitch"}…</p>}
        {!searching && typedName.length >= 2 && choices.length === 0 && !canAddTypedName && (
          <p className="multi-add-empty">
            <RotateCcw size={13} /> {query.trim().length >= 2
              ? "No matching channels found. You can still press Enter to add the exact name."
              : "Guest mode: type any public channel above to add it. Use"}
            {query.trim().length < 2 && <>
            {" "}<strong>twitch:name</strong> or <strong>kick:name</strong>, or click the logo to switch services.
            </>}
          </p>
        )}
      </div>
    </div>
  );
}
