import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { 
  ArrowLeft, 
  Plus,
  Calendar,
  Clock,
  Tag,
  ShoppingCart,
  Percent,
  MapPin,
  MessageSquare,
  Heart,
  Quote
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { VendorPost, InsertVendorPost } from "@shared/schema";

interface ExtendedVendorPost extends VendorPost {
  vendorName: string;
  vendorProfilePicture?: string;
  productName?: string;
  productPrice?: string;
  productImage?: string;
}

const POST_TYPES = [
  { value: "NEW_PRODUCT", label: "New Product", icon: "🆕" },
  { value: "PRODUCT_UPDATE", label: "Product Update", icon: "🔄" },
  { value: "PROMOTION", label: "Promotion", icon: "🏷️" },
  { value: "RESTOCK", label: "Restock Alert", icon: "📦" },
  { value: "ANNOUNCEMENT", label: "Announcement", icon: "📢" },
] as const;

export default function VendorFeed() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>("ALL");
  const queryClient = useQueryClient();

  // Create post form state
  const [newPost, setNewPost] = useState<{
    title: string;
    content: string;
    postType: "PRODUCT_UPDATE" | "NEW_PRODUCT" | "PROMOTION" | "ANNOUNCEMENT" | "RESTOCK";
    tags: string;
    originalPrice: string;
    discountPrice: string;
    discountPercentage: string;
    validUntil: string;
  }>({
    title: "",
    content: "",
    postType: "ANNOUNCEMENT",
    tags: "",
    originalPrice: "",
    discountPrice: "",
    discountPercentage: "",
    validUntil: ""
  });

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: (postData: InsertVendorPost) => apiRequest('POST', '/api/vendor-posts', postData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor-posts'] });
      setIsCreatePostOpen(false);
      setNewPost({
        title: "",
        content: "",
        postType: "ANNOUNCEMENT",
        tags: "",
        originalPrice: "",
        discountPrice: "",
        discountPercentage: "",
        validUntil: "",
      });
    }
  });

  // Fetch vendor posts
  const { data: posts = [], isLoading } = useQuery<ExtendedVendorPost[]>({
    queryKey: ['/api/vendor-posts', selectedFilter],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/vendor-posts' + (selectedFilter !== 'ALL' ? `?postType=${selectedFilter}` : ''));
      return response.json();
    }
  });

  // Add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: (data: { productId: string; quantity: number }) => 
      apiRequest('POST', '/api/cart', { 
        userId: user?.id, 
        productId: data.productId, 
        quantity: data.quantity 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
    }
  });

  // Add to wishlist mutation
  const addToWishlistMutation = useMutation({
    mutationFn: (productId: string) => 
      apiRequest('POST', '/api/wishlist', { userId: user?.id, productId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wishlist'] });
    }
  });

  const handleCreatePost = () => {
    if (!user || !newPost.title || !newPost.content) return;

    const postData: InsertVendorPost = {
      vendorId: user.id,
      title: newPost.title,
      content: newPost.content,
      postType: newPost.postType,
      tags: newPost.tags ? newPost.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
      ...(newPost.originalPrice && { originalPrice: newPost.originalPrice }),
      ...(newPost.discountPrice && { discountPrice: newPost.discountPrice }),
      ...(newPost.discountPercentage && { discountPercentage: parseInt(newPost.discountPercentage) }),
      ...(newPost.validUntil && { validUntil: new Date(newPost.validUntil) })
    };

    createPostMutation.mutate(postData);
  };

  const formatTimeAgo = (date: Date | null) => {
    if (!date) return "";
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  const getPostTypeIcon = (postType: string) => {
    const type = POST_TYPES.find(t => t.value === postType);
    return type?.icon || "📝";
  };

  const getPostTypeBadgeColor = (postType: string) => {
    switch (postType) {
      case "NEW_PRODUCT": return "bg-green-100 text-green-800";
      case "PROMOTION": return "bg-red-100 text-red-800";
      case "RESTOCK": return "bg-blue-100 text-blue-800";
      case "PRODUCT_UPDATE": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/dashboard")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold text-[#131313]">Vendor Feed</h1>
          </div>
          
          {user?.role === "MERCHANT" && (
            <Dialog open={isCreatePostOpen} onOpenChange={setIsCreatePostOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#4682b4] hover:bg-[#0b1a51] text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Post
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Post</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Input
                      placeholder="Post title..."
                      value={newPost.title}
                      onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <Select value={newPost.postType} onValueChange={(value: any) => setNewPost({ ...newPost, postType: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select post type" />
                      </SelectTrigger>
                      <SelectContent>
                        {POST_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.icon} {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Textarea
                      placeholder="What's happening with your business?"
                      value={newPost.content}
                      onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                      rows={4}
                    />
                  </div>

                  {(newPost.postType === "PROMOTION") && (
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Original price"
                        type="number"
                        value={newPost.originalPrice}
                        onChange={(e) => setNewPost({ ...newPost, originalPrice: e.target.value })}
                      />
                      <Input
                        placeholder="Discount %"
                        type="number"
                        value={newPost.discountPercentage}
                        onChange={(e) => setNewPost({ ...newPost, discountPercentage: e.target.value })}
                      />
                    </div>
                  )}

                  <div>
                    <Input
                      placeholder="Tags (comma separated)"
                      value={newPost.tags}
                      onChange={(e) => setNewPost({ ...newPost, tags: e.target.value })}
                    />
                  </div>

                  <Button 
                    onClick={handleCreatePost}
                    disabled={createPostMutation.isPending || !newPost.title || !newPost.content}
                    className="w-full bg-[#4682b4] hover:bg-[#0b1a51] text-white"
                  >
                    {createPostMutation.isPending ? "Creating..." : "Create Post"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="px-4 pb-3">
          <div className="flex space-x-2 overflow-x-auto">
            <Button
              variant={selectedFilter === "ALL" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedFilter("ALL")}
              className={selectedFilter === "ALL" ? "bg-[#4682b4] hover:bg-[#0b1a51] text-white" : ""}
            >
              All Posts
            </Button>
            {POST_TYPES.map((type) => (
              <Button
                key={type.value}
                variant={selectedFilter === type.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedFilter(type.value)}
                className={selectedFilter === type.value ? "bg-[#4682b4] hover:bg-[#0b1a51] text-white" : ""}
              >
                {type.icon} {type.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Posts Feed */}
      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-1/3 mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                    </div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-16 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-4xl mb-4">📱</div>
            <h3 className="text-lg font-medium text-[#131313] mb-2">No posts yet</h3>
            <p className="text-gray-600 mb-4">
              {user?.role === "MERCHANT" 
                ? "Be the first to share updates with your customers!" 
                : "Follow some vendors to see their latest updates here."
              }
            </p>
            {user?.role === "MERCHANT" && (
              <Button 
                onClick={() => setIsCreatePostOpen(true)}
                className="bg-[#4682b4] hover:bg-[#0b1a51] text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Post
              </Button>
            )}
          </div>
        ) : (
          posts.map((post: ExtendedVendorPost) => (
            <Card key={post.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={post.vendorProfilePicture} />
                      <AvatarFallback className="bg-[#4682b4] text-white">
                        {post.vendorName?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-[#131313]">{post.vendorName}</p>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>{formatTimeAgo(post.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <Badge className={`${getPostTypeBadgeColor(post.postType)} border-0`}>
                    {getPostTypeIcon(post.postType)} {POST_TYPES.find(t => t.value === post.postType)?.label}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <h3 className="font-semibold text-[#131313] mb-2">{post.title}</h3>
                <p className="text-gray-700 mb-3 whitespace-pre-wrap">{post.content}</p>

                {/* Promotion Details */}
                {post.postType === "PROMOTION" && (post.originalPrice || post.discountPercentage) && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <Percent className="h-4 w-4 text-red-600" />
                      <span className="font-medium text-red-800">Special Offer</span>
                    </div>
                    {post.originalPrice && (
                      <div className="text-sm">
                        <span className="text-gray-500 line-through">₦{parseFloat(post.originalPrice).toLocaleString()}</span>
                        {post.discountPercentage && (
                          <span className="ml-2 text-red-600 font-bold">
                            {post.discountPercentage}% OFF
                          </span>
                        )}
                      </div>
                    )}
                    {post.validUntil && (
                      <div className="flex items-center space-x-1 text-xs text-red-600 mt-1">
                        <Calendar className="h-3 w-3" />
                        <span>Valid until {new Date(post.validUntil).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                  <div className="flex items-center space-x-2 mb-3">
                    <Tag className="h-3 w-3 text-gray-400" />
                    <div className="flex flex-wrap gap-1">
                      {post.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Linked Product */}
                {post.productName && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-[#131313]">{post.productName}</p>
                        {post.productPrice && (
                          <p className="text-[#4682b4] font-bold">₦{parseFloat(post.productPrice).toLocaleString()}</p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          onClick={() => addToCartMutation.mutate({ productId: post.productId!, quantity: 1 })}
                          className="bg-[#4682b4] hover:bg-[#0b1a51] text-white"
                          disabled={addToCartMutation.isPending}
                        >
                          <ShoppingCart className="h-3 w-3 mr-1" />
                          Cart
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => addToWishlistMutation.mutate(post.productId!)}
                          className="border-[#4682b4] text-[#4682b4] hover:bg-[#4682b4] hover:text-white"
                          disabled={addToWishlistMutation.isPending}
                        >
                          <Heart className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Business Actions */}
                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="flex items-center space-x-2">
                    {/* Add to Cart - Show for all posts */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (post.productId) {
                          addToCartMutation.mutate({ productId: post.productId, quantity: 1 });
                        }
                      }}
                      className="flex items-center space-x-1 border-[#4682b4] text-[#4682b4] hover:bg-[#4682b4] hover:text-white"
                      disabled={!post.productId || addToCartMutation.isPending}
                    >
                      <ShoppingCart className="h-3 w-3" />
                      <span>Add to Cart</span>
                    </Button>
                    
                    {/* Get Quote */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Navigate to chat with quote request
                        setLocation(`/chat?vendorId=${post.vendorId}&productId=${post.productId}&type=QUOTE`);
                      }}
                      className="flex items-center space-x-1 border-gray-300 text-gray-600 hover:bg-gray-50"
                    >
                      <MessageSquare className="h-3 w-3" />
                      <span>Quote</span>
                    </Button>
                  </div>
                  
                  {/* Add to Wishlist */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (post.productId) {
                        addToWishlistMutation.mutate(post.productId);
                      }
                    }}
                    className="text-gray-600 hover:text-red-500"
                    disabled={!post.productId || addToWishlistMutation.isPending}
                  >
                    <Heart className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}