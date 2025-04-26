"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings2, Key, Wand2, Bot, Braces, Lock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { getAvailableModels } from "@/lib/models";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { FC } from "react";

const formSchema = z.object({
  modelName: z.string().min(1, "Model name is required"),
  visionModelName: z.string().min(1, "Vision model name is required"),
  openaiKey: z.string().optional(),
  anthropicKey: z.string().optional(),
  googleKey: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type ConfigurationFormProps = {
  deployment: {
    modelName?: string;
    visionModelName?: string;
    openaiKeyPresent?: boolean;
    anthropicKeyPresent?: boolean;
    googleKeyPresent?: boolean;
  } | null;
  isGeneratingNewLicense: boolean;
  onGenerateLicenseChange: (value: boolean) => void;
  onSubmit: (values: FormValues & { generateNewLicenseKey: boolean }) => void;
};

export const ConfigurationForm: FC<ConfigurationFormProps> = ({ 
  deployment, 
  isGeneratingNewLicense, 
  onGenerateLicenseChange,
  onSubmit 
}) => {
  const availableModels = getAvailableModels();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      modelName: deployment?.modelName || "gpt-4.1-mini",
      visionModelName: deployment?.visionModelName || "gpt-4.1-mini",
      openaiKey: "",
      anthropicKey: "",
      googleKey: "",
    },
    mode: "onChange"
  });

  const handleSubmit = (values: FormValues) => {
    onSubmit({
      ...values,
      generateNewLicenseKey: isGeneratingNewLicense,
    });
  };

  return (
    <Card className="bg-gradient-to-br from-background to-muted/30">
      <div className="grid gap-6 border rounded-lg p-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Models Section */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Text Model */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Bot className="h-4 w-4" />
                  <span>Text Model</span>
                </div>
                <FormField
                  control={form.control}
                  name="modelName"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="h-9 bg-background/50 backdrop-blur-sm border-muted-foreground/20">
                            <SelectValue placeholder="Select a model" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableModels.map(model => (
                            <SelectItem key={model} value={model} className="font-mono">
                              {model}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Current</span>
                        <Badge variant="outline" className="font-mono text-xs font-medium text-muted-foreground">
                          {deployment?.modelName || 'Not set'}
                        </Badge>
                      </div>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Vision Model */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Bot className="h-4 w-4" />
                  <span>Vision Model</span>
                </div>
                <FormField
                  control={form.control}
                  name="visionModelName"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="h-9 bg-background/50 backdrop-blur-sm border-muted-foreground/20">
                            <SelectValue placeholder="Select a model" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableModels.map(model => (
                            <SelectItem key={model} value={model} className="font-mono">
                              {model}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Current</span>
                        <Badge variant="outline" className="font-mono text-xs font-medium text-muted-foreground">
                          {deployment?.visionModelName || 'Not set'}
                        </Badge>
                      </div>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* API Keys Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Key className="h-4 w-4" />
                <span>API Keys</span>
              </div>

              <div className="grid gap-4">
                {/* OpenAI Key */}
                <FormField
                  control={form.control}
                  name="openaiKey"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-xs text-muted-foreground">OpenAI API Key</FormLabel>
                        <Badge 
                          variant={deployment?.openaiKeyPresent ? "default" : "secondary"}
                          className={cn(
                            "text-xs",
                            deployment?.openaiKeyPresent && "bg-primary/15 text-primary hover:bg-primary/20"
                          )}
                        >
                          {deployment?.openaiKeyPresent ? "Configured" : "Not Set"}
                        </Badge>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="password"
                            placeholder="Enter OpenAI API key"
                            className="h-9 bg-background/50 backdrop-blur-sm border-muted-foreground/20 pr-9"
                            {...field}
                          />
                          <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {/* Anthropic Key */}
                <FormField
                  control={form.control}
                  name="anthropicKey"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-xs text-muted-foreground">Anthropic API Key</FormLabel>
                        <Badge 
                          variant={deployment?.anthropicKeyPresent ? "default" : "secondary"}
                          className={cn(
                            "text-xs",
                            deployment?.anthropicKeyPresent && "bg-primary/15 text-primary hover:bg-primary/20"
                          )}
                        >
                          {deployment?.anthropicKeyPresent ? "Configured" : "Not Set"}
                        </Badge>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="password"
                            placeholder="Enter Anthropic API key"
                            className="h-9 bg-background/50 backdrop-blur-sm border-muted-foreground/20 pr-9"
                            {...field}
                          />
                          <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {/* Google Key */}
                <FormField
                  control={form.control}
                  name="googleKey"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-xs text-muted-foreground">Google API Key</FormLabel>
                        <Badge 
                          variant={deployment?.googleKeyPresent ? "default" : "secondary"}
                          className={cn(
                            "text-xs",
                            deployment?.googleKeyPresent && "bg-primary/15 text-primary hover:bg-primary/20"
                          )}
                        >
                          {deployment?.googleKeyPresent ? "Configured" : "Not Set"}
                        </Badge>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="password"
                            placeholder="Enter Google API key"
                            className="h-9 bg-background/50 backdrop-blur-sm border-muted-foreground/20 pr-9"
                            {...field}
                          />
                          <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* License Key Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Braces className="h-4 w-4" />
                <span>License Key</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 backdrop-blur-sm border border-muted-foreground/20">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Generate New License Key</label>
                  <p className="text-xs text-muted-foreground">
                    Create a new license key for your instance
                  </p>
                </div>
                <Switch
                  checked={isGeneratingNewLicense}
                  onCheckedChange={onGenerateLicenseChange}
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              {isGeneratingNewLicense && (
                <Alert className="bg-yellow-500/10 border-yellow-500/20">
                  <Wand2 className="h-4 w-4 text-yellow-500" />
                  <AlertTitle className="text-yellow-500">New License Key Generation</AlertTitle>
                  <AlertDescription className="text-yellow-500/90">
                    This will create a new license key and update your deployment. 
                    Make sure to update your plugin settings afterward.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full h-9 text-sm font-medium"
              >
                Continue to Review
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </Card>
  ); 
};
