import React, { useState, useEffect } from 'react'
import { Archive, Clock, Eye, RotateCcw, Trash2, ArrowLeft, Image as ImageIcon, Star } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { postService } from '../../services/postService'
import { storyService } from '../../services/storyService'
import { highlightService } from '../../services/highlightService'
import type { Post, Story } from '../../types/database.types'

interface ArchiveViewProps {
  onBack?: () => void
  onPostClick?: (post: Post) => void
}

export const ArchiveView: React.FC<ArchiveViewProps> = ({ onBack, onPostClick }) => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'posts' | 'stories'>('posts')
  const [archivedPosts, setArchivedPosts] = useState<Post[]>([])
  const [archivedStories, setArchivedStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [selectedStory, setSelectedStory] = useState<Story | null>(null)

  useEffect(() => {
    if (!user) return
    loadArchiveData()
  }, [user, activeTab])

  const loadArchiveData = async () => {
    if (!user) return
    setLoading(true)
    try {
      if (activeTab === 'posts') {
        const posts = await postService.getArchivedPosts(user.id)
        setArchivedPosts(posts)
      } else {
        const stories = await storyService.getArchivedStories(user.id)
        setArchivedStories(stories)
      }
    } catch (err) {
      console.error('Error loading archive data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleUnarchive = async (post: Post) => {
    if (!user) return
    setActionLoading(post.id)
    try {
      await postService.unarchivePost(post.id, user.id)
      setArchivedPosts((prev) => prev.filter((p) => p.id !== post.id))
      setSelectedPost(null)
    } catch (err) {
      console.error('Failed to unarchive post:', err)
      alert('Failed to unarchive post. Please try again.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (!user || !window.confirm('Are you sure you want to permanently delete this post?')) return
    setActionLoading(postId)
    try {
      await postService.deletePost(postId, user.id)
      setArchivedPosts((prev) => prev.filter((p) => p.id !== postId))
      setSelectedPost(null)
    } catch (err) {
      console.error('Failed to delete post:', err)
      alert('Failed to delete post.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteStory = async (storyId: string) => {
    if (!user || !window.confirm('Are you sure you want to permanently delete this story?')) return
    setActionLoading(storyId)
    try {
      await storyService.deleteStory(storyId, user.id)
      setArchivedStories((prev) => prev.filter((s) => s.id !== storyId))
      setSelectedStory(null)
    } catch (err) {
      console.error('Failed to delete story:', err)
      alert('Failed to delete story.')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-800 mb-6">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-300"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <Archive className="w-6 h-6 text-purple-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">Archive</h1>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center bg-gray-900 border border-gray-800 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'posts'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Posts Archive
          </button>
          <button
            onClick={() => setActiveTab('stories')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'stories'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            Stories Archive
          </button>
        </div>
      </div>

      {/* Info notice */}
      <div className="bg-gray-900/60 border border-gray-800/80 rounded-xl p-3.5 mb-6 text-xs text-gray-400 flex items-center justify-between">
        <span>
          Only you can see your archived items. Restoring a post will make it visible on your profile again in its original chronological position.
        </span>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-500">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-sm">Loading archive...</p>
        </div>
      ) : activeTab === 'posts' ? (
        archivedPosts.length === 0 ? (
          <div className="text-center py-20 px-4">
            <div className="w-16 h-16 bg-gray-900 border border-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-gray-500">
              <Archive className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">No Archived Posts</h3>
            <p className="text-sm text-gray-400 max-w-sm mx-auto">
              When you archive posts from your profile or feed, they'll be saved here safely and hidden from others.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            {archivedPosts.map((post) => {
              const mediaItem = post.media?.[0]
              const hasMedia = Boolean(mediaItem?.storage_path)

              return (
                <div
                  key={post.id}
                  onClick={() => setSelectedPost(post)}
                  className="group relative aspect-square bg-gray-900 rounded-xl overflow-hidden cursor-pointer border border-gray-800/80 hover:border-purple-500/50 transition-all shadow-sm"
                >
                  {hasMedia ? (
                    mediaItem?.media_type === 'video' ? (
                      <video
                        src={mediaItem.storage_path}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={mediaItem?.storage_path}
                        alt="Archived post"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    )
                  ) : (
                    <div className="w-full h-full p-4 flex flex-col justify-between bg-gradient-to-br from-gray-900 to-gray-800">
                      <p className="text-xs text-gray-300 line-clamp-4 leading-relaxed">{post.caption}</p>
                      <span className="text-[10px] text-gray-500">
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white font-medium text-sm">
                    <span className="flex items-center gap-1.5">
                      <RotateCcw className="w-4 h-4 text-purple-400" />
                      Restore
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )
      ) : (
        /* Stories Archive Tab */
        archivedStories.length === 0 ? (
          <div className="text-center py-20 px-4">
            <div className="w-16 h-16 bg-gray-900 border border-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-gray-500">
              <Clock className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">No Archived Stories</h3>
            <p className="text-sm text-gray-400 max-w-sm mx-auto">
              Your stories automatically remain archived here even after they disappear from your active 24-hour profile.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {archivedStories.map((story) => (
              <div
                key={story.id}
                onClick={() => setSelectedStory(story)}
                className="group relative aspect-[9/16] bg-gray-900 rounded-2xl overflow-hidden cursor-pointer border border-gray-800 hover:border-pink-500/50 transition-all shadow-md"
              >
                {story.media_type === 'video' ? (
                  <video src={story.media_url} className="w-full h-full object-cover" />
                ) : (
                  <img
                    src={story.media_url}
                    alt="Archived story"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[11px] font-semibold text-white">
                  {new Date(story.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
                {story.caption && (
                  <p className="absolute bottom-3 left-3 right-3 text-xs text-white line-clamp-2 drop-shadow">
                    {story.caption}
                  </p>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Selected Post Modal (View & Restore / Delete) */}
      {selectedPost && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setSelectedPost(null)}
        >
          <div
            className="bg-gray-900 border border-gray-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Archived Post</h3>
                <p className="text-xs text-gray-400">
                  Created {new Date(selectedPost.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedPost(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg text-sm"
              >
                ✕
              </button>
            </div>

            {/* Media / Preview */}
            <div className="relative aspect-square bg-black flex items-center justify-center">
              {selectedPost.media?.[0]?.storage_path ? (
                selectedPost.media[0].media_type === 'video' ? (
                  <video
                    src={selectedPost.media[0].storage_path}
                    controls
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <img
                    src={selectedPost.media[0].storage_path}
                    alt="Post preview"
                    className="max-h-full max-w-full object-contain"
                  />
                )
              ) : (
                <div className="p-6 text-center text-gray-300">
                  <p className="text-sm">{selectedPost.caption}</p>
                </div>
              )}
            </div>

            {/* Caption */}
            {selectedPost.caption && (
              <div className="p-4 border-t border-gray-800 text-sm text-gray-300">
                <span className="font-semibold text-white mr-2">
                  {selectedPost.author?.username || 'You'}:
                </span>
                {selectedPost.caption}
              </div>
            )}

            {/* Action Buttons */}
            <div className="p-4 bg-gray-950/60 border-t border-gray-800 flex flex-col gap-2">
              <button
                onClick={() => handleUnarchive(selectedPost)}
                disabled={actionLoading === selectedPost.id}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                {actionLoading === selectedPost.id ? 'Restoring...' : 'Show on Profile (Undo Archive)'}
              </button>

              {onPostClick && (
                <button
                  onClick={() => {
                    const p = selectedPost
                    setSelectedPost(null)
                    onPostClick(p)
                  }}
                  className="w-full py-2 px-4 bg-gray-800 hover:bg-gray-700 text-gray-200 font-medium rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
                >
                  <Eye className="w-4 h-4" />
                  View Full Details
                </button>
              )}

              <button
                onClick={() => handleDeletePost(selectedPost.id)}
                disabled={actionLoading === selectedPost.id}
                className="w-full py-2 px-4 hover:bg-red-500/10 text-red-400 font-medium rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
              >
                <Trash2 className="w-4 h-4" />
                Delete Post Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Story Modal (View & Delete) */}
      {selectedStory && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setSelectedStory(null)}
        >
          <div
            className="bg-gray-900 border border-gray-800 rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Story Header */}
            <div className="absolute top-0 inset-x-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-semibold">
                  Archived • {new Date(selectedStory.created_at).toLocaleDateString()}
                </span>
              </div>
              <button
                onClick={() => setSelectedStory(null)}
                className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            {/* Media */}
            <div className="relative aspect-[9/16] bg-black flex items-center justify-center">
              {selectedStory.media_type === 'video' ? (
                <video
                  src={selectedStory.media_url}
                  autoPlay
                  controls
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={selectedStory.media_url}
                  alt="Story"
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* Story Footer */}
            <div className="p-3 bg-gray-950 border-t border-gray-800 flex items-center justify-between">
              {selectedStory.caption && (
                <p className="text-xs text-gray-300 line-clamp-1">{selectedStory.caption}</p>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={async () => {
                    if (!user || !selectedStory) return
                    try {
                      await highlightService.createHighlight(
                        user.id,
                        'Archive Memories ⭐',
                        selectedStory.media_url,
                        [selectedStory]
                      )
                      alert('Story added to Profile Highlights! ⭐')
                    } catch {
                      alert('Could not add to highlights.')
                    }
                  }}
                  className="p-2 text-yellow-400 hover:bg-yellow-500/10 rounded-lg text-xs flex items-center gap-1.5 transition-colors font-semibold"
                  title="Add to Highlights"
                >
                  <Star className="w-4 h-4 fill-yellow-400" />
                  Highlight
                </button>
                <button
                  onClick={() => handleDeleteStory(selectedStory.id)}
                  disabled={actionLoading === selectedStory.id}
                  className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                  title="Delete from archive"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
