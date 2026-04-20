import { useState, useRef, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from "react-native";

export default function AIPage() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const askAI = async () => {
    if (!question.trim() || loading) return;

    const userMsg = { type: "user", text: question };
    setMessages(prev => [...prev, userMsg]);
    setQuestion("");
    setLoading(true);

    try {
      const res = await fetch("https://mechanic-finder-backend.onrender.com/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim() })
      });

      const data = await res.json();
      const botMsg = {
        type: "bot",
        text: data.reply || "Quick check: Fuel? Battery? Find mechanics nearby!"
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.log("AI ERROR:", err);
      setMessages(prev => [...prev, { 
        type: "bot", 
        text: "⚠️ Network error. Check connection!" 
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={{ flex: 1, backgroundColor: "#111" }}>
        
     <View style={{
  paddingVertical: 10,
  borderBottomWidth: 1,
  borderBottomColor: "#222",
  marginBottom: 10
}}>
  <Text style={{
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center"
  }}>
    Mechanic AI
  </Text>
</View>

        {/* Messages Area - FLEX 1 = Takes remaining space */}
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }} // ← flex: 1 + marginBottom
          contentContainerStyle={{ 
            paddingBottom: 80,
            flexGrow: 1 
          }}
          showsVerticalScrollIndicator={false}
        >{messages.length === 0 ? (
  <View style={{
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20
  }}>
    <Text style={{
      color: "#fff",
      fontSize: 20,
      fontWeight: "600",
      marginBottom: 10
    }}>
      🤖 AI Mechanic
    </Text>

    <Text style={{
      color: "#aaa",
      textAlign: "center",
      lineHeight: 22
    }}>
      Ask anything about your vehicle problems:
    </Text>

    <Text style={{
      color: "#666",
      marginTop: 10,
      textAlign: "center"
    }}>
      • Vehicle won't start{"\n"}
      • Engine overheating{"\n"}
      • Strange noise
    </Text>
  </View>
) : (
            messages.map((msg, index) => (
              <View
                key={index}
                style={{
                  alignSelf: msg.type === "user" ? "flex-end" : "flex-start",
                  backgroundColor: msg.type === "user" ? "#f59e0b" : "#2a2a2a",
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  marginVertical: 6,
                  borderRadius: 20,
                  maxWidth: "85%",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 5
                }}
              >
                <Text style={{ 
                  color: "#fff", 
                  fontSize: 16,
                  lineHeight: 22 
                }}>
                  {msg.text}
                </Text>
              </View>
            ))
          )}

          {/* Loading indicator */}
          {loading && (
            <View style={{
              alignSelf: "flex-start",
              backgroundColor: "#3a3a3a",
              paddingHorizontal: 16,
              paddingVertical: 12,
              marginVertical: 6,
              borderRadius: 20,
              maxWidth: "85%"
            }}>
              <Text style={{ 
                color: "#bbb", 
                fontSize: 16,
                fontStyle: "italic" 
              }}>
                AI is typing... 🤔
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Input Area - FIXED at bottom */}
        <View style={{
  flexDirection: "row",
  padding: 10,
  backgroundColor: "#1a1a1a",
  borderTopWidth: 1,
  borderTopColor: "#333"
}}>
          <TextInput
            value={question}
            onChangeText={setQuestion}
            placeholder="Type your car problem..."
            placeholderTextColor="#888"
            editable={!loading}
            multiline={false}
            style={{
              flex: 1,
              backgroundColor: "#2a2a2a",
              borderRadius: 25,
              paddingHorizontal: 20,
              paddingVertical: 12,
              color: "#fff",
              fontSize: 16,
              marginRight: 10,
              maxHeight: 50 // ← Prevent expansion
            }}
            onSubmitEditing={askAI}
            returnKeyType="send"
          />
          
          <TouchableOpacity
            onPress={askAI}
            disabled={loading || !question.trim()}
            activeOpacity={0.7}
            style={{
              backgroundColor: loading || !question.trim() 
                ? "#555" 
                : "#f59e0b",
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 25,
              justifyContent: "center",
              minWidth: 70
              
            }}
          >
            <Text style={{ 
              color: "#fff", 
              fontWeight: "bold",
              fontSize: 16 
            }}>
              {loading ? "⏳" : "Send"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}